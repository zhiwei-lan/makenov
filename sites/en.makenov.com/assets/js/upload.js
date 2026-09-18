/* ============================================================
   MAKENOV 이미지 업로드 — 관리자에서 파일을 직접 올린다.
   서버가 없는 MVP이므로:
     1) 브라우저에서 리사이즈·압축 (원본 4000px 사진 → 1600px / JPEG 0.82)
     2) IndexedDB에 저장 (localStorage는 5MB라 사진 몇 장이면 꽉 참)
     3) 데이터에는 'mkimg:<id>' 참조만 넣고, 페이지 로드 시 실제 이미지로 치환
   2단계에서 Supabase Storage로 옮길 때는 save()/hydrate() 두 함수만 바꾸면 된다.
   ============================================================ */
const MkImg = {
  DB: 'makenov_img', STORE: 'img',
  MAXW: 1600,        // 일반 사진 가로 상한
  QUALITY: 0.86,
  /* ★ 상세페이지(세로로 긴 이미지) 전용
     한국식 상세페이지는 848×17000 같은 세로 20배짜리가 흔하다.
     - 긴 변 기준으로 줄이면 가로가 80px이 돼 완전히 뭉개진다 (실제로 그랬음)
     - 브라우저 캔버스는 한 변 16384px 제한이 있어 통째로도 못 그린다
     → 가로만 기준으로 잡고, 세로는 조각내서 저장한 뒤 이어 붙인다 */
  /* 가로 3구간 (2026-09-15): 1200 미만은 1200 으로 키우고 언샤프(HiDPI 화면에서 브라우저가 늘리지 않고 줄이게),
     1200~1600 은 그대로, 1600 초과는 1600 으로 줄임(서버 WebP 변환 한도와 같음) */
  DETAIL_MINW: 1200,
  DETAIL_MAXW: 1600,
  SLICE_H: 2400,
  DETAIL_QUALITY: 0.92,   // 글자가 많아 품질을 높인다
  TALL_RATIO: 2.5,        // 세로/가로가 이 값을 넘으면 상세페이지로 취급
  _db: null,

  /* ---------- IndexedDB ---------- */
  open(){
    if(this._db) return Promise.resolve(this._db);
    return new Promise((res, rej)=>{
      const rq = indexedDB.open(this.DB, 1);
      rq.onupgradeneeded = e => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains(this.STORE)) db.createObjectStore(this.STORE);
      };
      rq.onsuccess = e => { this._db = e.target.result; res(this._db); };
      rq.onerror   = e => rej(e.target.error);
    });
  },
  async _tx(mode, fn){
    const db = await this.open();
    return new Promise((res, rej)=>{
      const tx = db.transaction(this.STORE, mode);
      const rq = fn(tx.objectStore(this.STORE));
      rq.onsuccess = () => res(rq.result);
      rq.onerror   = () => rej(rq.error);
    });
  },
  put(id, dataUrl){ return this._tx('readwrite', s => s.put(dataUrl, id)); },
  get(id){         return this._tx('readonly',  s => s.get(id)); },
  del(id){         return this._tx('readwrite', s => s.delete(id)); },
  keys(){          return this._tx('readonly',  s => s.getAllKeys()); },
  values(){        return this._tx('readonly',  s => s.getAll()); },

  /* 파일 → Image 객체 */
  _load(file){
    return new Promise((res, rej)=>{
      if(!/^image\//.test(file.type)) return rej(new Error('이미지 파일만 올릴 수 있습니다'));
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('파일을 읽지 못했습니다'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('이미지를 열지 못했습니다'));
        img.onload = () => res(img);
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  },

  /* 세로로 긴 상세페이지인가 */
  isTall(img){ return img.height / img.width >= this.TALL_RATIO; },

  /* ---------- 리사이즈·압축 ----------
     ★ 축소 기준은 '긴 변'이 아니라 '가로'다.
       긴 변 기준으로 하면 세로로 긴 상세페이지의 가로가 수십 px로 뭉개진다. */
  /* GIF 는 캔버스로 다시 그리면 첫 프레임만 남아 움직임이 사라진다 → 원본 바이트 그대로 (20MB 이하) */
  GIF_MAX: 20 * 1024 * 1024,
  isGif(file){ return /^image\/gif$/i.test(file.type) || /\.gif$/i.test(file.name || ''); },
  async _raw(file){
    if(file.size > this.GIF_MAX) throw new Error('GIF 는 20MB 이하만 올릴 수 있습니다 (지금 ' + (file.size/1048576).toFixed(1) + 'MB). 크기를 줄이거나 프레임 수를 줄여 주세요');
    const img = await this._load(file);
    const dataUrl = await new Promise((res, rej)=>{ const fr = new FileReader(); fr.onerror = () => rej(new Error('파일을 읽지 못했습니다')); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
    return { dataUrl, w: img.width, h: img.height, bytes: file.size };
  },

  async compress(file){
    if(this.isGif(file)) return this._raw(file);
    const img = await this._load(file);
    const keepAlpha = /png|webp|svg/i.test(file.type);
    const maxw = this.MAXW;   // 세로형 상세는 sliceTall 이 맡는다(3구간 규칙)
    const q = this.isTall(img) ? this.DETAIL_QUALITY : this.QUALITY;
    const scale = Math.min(1, maxw / img.width);   // 확대는 하지 않는다
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    /* 캔버스 한 변 한계(브라우저 대체로 16384px)를 넘으면 통째로 못 그린다 */
    if(h > 16000) throw new Error('너무 긴 이미지입니다. 상세페이지는 자동 분할 업로드를 쓰세요');

    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    if(!keepAlpha){ cx.fillStyle = '#fff'; cx.fillRect(0,0,w,h); }
    cx.drawImage(img, 0, 0, w, h);
    const out = keepAlpha ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', q);
    return { dataUrl: out, w, h, bytes: Math.round(out.length * 0.75) };
  },

  /* ---------- 상세페이지 분할 ----------
     세로로 긴 이미지를 가로는 그대로 두고 세로만 SLICE_H 단위로 잘라 여러 장으로 만든다.
     화면에서는 이어 붙여 표시하므로 사용자에겐 한 장처럼 보인다.
     onProgress(현재, 전체) 로 진행률을 알린다. */
  /* 상세페이지 목표 가로 (3구간) */
  _detailW(srcW){ return srcW < this.DETAIL_MINW ? this.DETAIL_MINW : Math.min(srcW, this.DETAIL_MAXW); },

  /* 언샤프 마스크 — 확대한 조각의 윤곽을 되살린다 (5탭 가우시안 블러와의 차이를 되더함).
     amount 0.7 · threshold 2 : 서버 스크립트(reupload_detail.py)와 같은 값 */
  _unsharp(cx, w, h, amount, threshold){
    const id = cx.getImageData(0, 0, w, h), d = id.data, n = w * h;
    const k = [1, 4, 6, 4, 1], ks = 16;
    const tmp = new Float32Array(n * 3), blur = new Float32Array(n * 3);
    for(let y = 0; y < h; y++){                       // 가로 블러
      for(let x = 0; x < w; x++){
        let r = 0, g = 0, b = 0;
        for(let i = -2; i <= 2; i++){
          const xx = Math.min(w - 1, Math.max(0, x + i)), o = (y * w + xx) * 4, kk = k[i + 2];
          r += d[o] * kk; g += d[o + 1] * kk; b += d[o + 2] * kk;
        }
        const t = (y * w + x) * 3; tmp[t] = r / ks; tmp[t + 1] = g / ks; tmp[t + 2] = b / ks;
      }
    }
    for(let y = 0; y < h; y++){                       // 세로 블러
      for(let x = 0; x < w; x++){
        let r = 0, g = 0, b = 0;
        for(let i = -2; i <= 2; i++){
          const yy = Math.min(h - 1, Math.max(0, y + i)), t = (yy * w + x) * 3, kk = k[i + 2];
          r += tmp[t] * kk; g += tmp[t + 1] * kk; b += tmp[t + 2] * kk;
        }
        const t = (y * w + x) * 3; blur[t] = r / ks; blur[t + 1] = g / ks; blur[t + 2] = b / ks;
      }
    }
    for(let i = 0; i < n; i++){
      const o = i * 4, t = i * 3;
      for(let c = 0; c < 3; c++){
        const diff = d[o + c] - blur[t + c];
        if(Math.abs(diff) >= threshold){ const v = d[o + c] + diff * amount; d[o + c] = v < 0 ? 0 : v > 255 ? 255 : v; }
      }
    }
    cx.putImageData(id, 0, 0);
  },

  async sliceTall(file, onProgress){
    const img = await this._load(file);
    const scale = this._detailW(img.width) / img.width;   // 1 보다 클 수 있다(확대)
    const w = Math.round(img.width * scale);
    const totalH = Math.round(img.height * scale);
    const n = Math.ceil(totalH / this.SLICE_H);
    const parts = [];

    for(let i=0; i<n; i++){
      if(onProgress) onProgress(i+1, n);
      const dy = i * this.SLICE_H;
      const dh = Math.min(this.SLICE_H, totalH - dy);
      /* 원본 좌표계로 환산해 잘라낸다 */
      const sy = dy / scale;
      const sh = dh / scale;

      const cv = document.createElement('canvas');
      cv.width = w; cv.height = dh;
      const cx = cv.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.fillStyle = '#fff'; cx.fillRect(0,0,w,dh);
      cx.drawImage(img, 0, sy, img.width, sh, 0, 0, w, dh);
      if(scale > 1) this._unsharp(cx, w, dh, 0.7, 2);   // 확대했을 때만
      const dataUrl = cv.toDataURL('image/jpeg', this.DETAIL_QUALITY);
      parts.push({ dataUrl, w, h: dh, bytes: Math.round(dataUrl.length * 0.75) });
      cv.width = cv.height = 0;   // 메모리 즉시 해제
      await new Promise(r=>setTimeout(r, 0));  // UI가 멈추지 않게 양보
    }
    return { parts, w, totalH, count: n, originW: img.width, originH: img.height };
  },

  _newId(){
    return 'i' + Date.now().toString(36)
             + Math.floor(performance.now()*1000%1e6).toString(36)
             + Math.floor(Math.random()*1e4).toString(36);
  },

  /* 이미 만들어진 dataUrl 을 저장 */
  async _store(dataUrl){
    const id = this._newId();
    await this.put(id, dataUrl);
    this._cache[id] = dataUrl;
    return 'mkimg:' + id;
  },

  /* 파일 저장 → 'mkimg:<id>' 참조 반환 */
  async save(file){
    const { dataUrl, w, h, bytes } = await this.compress(file);
    const ref = await this._store(dataUrl);
    return { ref, dataUrl, w, h, bytes };
  },

  /* 상세페이지 저장 → 조각 참조 배열 반환 */
  async saveDetail(file, onProgress){
    const img = await this._load(file);
    if(!this.isTall(img) || this.isGif(file)){   // 평범한 비율이거나 GIF(자를 수 없음)면 한 장 그대로
      const r = await this.save(file);
      return { refs:[r.ref], count:1, w:r.w, totalH:r.h, bytes:r.bytes,
               originW:img.width, originH:img.height, sliced:false };
    }
    const { parts, w, totalH, count, originW, originH } = await this.sliceTall(file, onProgress);
    const refs = [], sizes = [];
    let bytes = 0;
    for(const p of parts){
      refs.push(await this._store(p.dataUrl));
      sizes.push({ w:p.w, h:p.h });        // 지연 로딩 시 화면 밀림(CLS) 방지용
      bytes += p.bytes;
    }
    return { refs, sizes, count, w, totalH, bytes, originW, originH, sliced:true };
  },

  /* ---------- 참조 해석 ---------- */
  _cache: {},
  isRef(v){ return typeof v === 'string' && v.startsWith('mkimg:'); },
  resolve(v){
    if(!this.isRef(v)) return v;
    return this._cache[v.slice(6)] || '';
  },

  /* 저장된 이미지를 전부 캐시에 올린 뒤, 데이터의 mkimg: 참조를 실제 이미지로 치환.
     페이지 렌더 코드는 손대지 않아도 되게 부팅 시 한 번만 돌린다. */
  /* 캐시만 채운다 (데이터는 건드리지 않음) — 관리자는 원본 mkimg: 참조를 유지해야 하므로 이걸 쓴다 */
  async loadCache(){
    try{
      const [keys, vals] = await Promise.all([this.keys(), this.values()]);
      keys.forEach((k,i)=>{ this._cache[k] = vals[i]; });
      return true;
    }catch(e){ return false; }
  },

  async hydrate(){
    if(!await this.loadCache()) return;   // IndexedDB 불가 환경에서도 페이지는 떠야 한다

    const fix = s => this.isRef(s) ? (this.resolve(s) || s) : s;
    /* 배열 원소도 인덱스로 다시 넣어야 한다 — gallery 처럼 문자열 배열이 있다 */
    const walk = obj => {
      if(!obj || typeof obj !== 'object') return;
      const keys = Array.isArray(obj) ? obj.map((_,i)=>i) : Object.keys(obj);
      keys.forEach(k=>{
        const v = obj[k];
        if(typeof v === 'string') obj[k] = fix(v);
        else walk(v);
      });
    };
    [typeof MK_PRODUCTS!=='undefined'&&MK_PRODUCTS, typeof MK_COLUMNS!=='undefined'&&MK_COLUMNS,
     typeof MK_COMPANIES!=='undefined'&&MK_COMPANIES, typeof MK_HERO!=='undefined'&&MK_HERO]
      .filter(Boolean).forEach(walk);
  },

  /* ---------- 사용량 ---------- */
  async usage(){
    let used = 0, count = 0;
    try{
      const vals = await this.values();
      count = vals.length;
      vals.forEach(v => used += v.length * 0.75);
    }catch(e){}
    let quota = 0;
    try{ const est = await navigator.storage.estimate(); quota = est.quota || 0; }catch(e){}
    return { count, used, quota };
  },

  /* 어느 데이터에서도 참조하지 않는 이미지 정리 */
  async gc(){
    const used = new Set();
    const walk = obj => {
      if(!obj || typeof obj !== 'object') return;
      Object.values(obj).forEach(v=>{
        if(typeof v === 'string'){ if(this.isRef(v)) used.add(v.slice(6)); }
        else walk(v);
      });
    };
    /* 원본(hydrate 전) 참조는 localStorage 오버라이드에 남아 있다 */
    ['mk_products_override','mk_columns_override'].forEach(k=>{
      try{ walk(JSON.parse(localStorage.getItem(k)||'null')); }catch(e){}
    });
    const keys = await this.keys();
    const dead = keys.filter(k=>!used.has(k));
    for(const k of dead){ await this.del(k); delete this._cache[k]; }
    return dead.length;
  },
};

/* 내보내기용 — mkimg: 참조를 실제 data URL로 바꾼 깊은 복사본을 만든다.
   이걸 거치지 않으면 다른 기기에서 이미지가 전부 깨진다. */
function inlineImages(obj){
  if(Array.isArray(obj)) return obj.map(inlineImages);
  if(obj && typeof obj === 'object'){
    const out = {};
    Object.keys(obj).forEach(k=>{ out[k] = inlineImages(obj[k]); });
    return out;
  }
  if(typeof obj === 'string' && MkImg.isRef(obj)) return MkImg.resolve(obj) || obj;
  return obj;
}

function fmtBytes(n){
  if(n < 1024) return n + ' B';
  if(n < 1024*1024) return (n/1024).toFixed(0) + ' KB';
  return (n/1024/1024).toFixed(1) + ' MB';
}
