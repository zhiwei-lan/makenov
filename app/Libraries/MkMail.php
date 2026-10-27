<?php

namespace App\Libraries;

/**
 * 메일 보내기 — 관리자 화면(행사 일정 › 알림 설정)에 넣은 SMTP 를 쓴다.
 * ------------------------------------------------------------
 * 원래 Api\Meet 안에 private 으로 있던 것을 2026-10-27 여기로 옮겼다. 명함 안내 메일(Api\Cards::notify)도
 * 같은 SMTP 로 보내야 해서다. Meet 은 이 클래스로 위임한다 — 동작은 그대로.
 *
 * 설정은 meet_config(k,v) 테이블. REST 로 노출되지 않고, smtp_pass 는 enc() 로 암호화돼 있다.
 * SMTP 가 비어 있으면 CI 기본(Config\Email, 보통 mail()) 으로 떨어진다.
 */
class MkMail
{
    public static function cfgGet(string $k): string
    {
        $db = db_connect();
        if (! $db->tableExists('meet_config')) {
            return '';
        }
        $r = $db->table('meet_config')->where('k', $k)->get()->getRowArray();
        return $r ? (string) ($r['v'] ?? '') : '';
    }

    /** 비밀번호 암호화 키 — DB 접속 정보에서 파생. .env 를 늘리지 않기 위해서다 */
    private static function secretKey(): string
    {
        $d = config('Database')->default ?? [];
        return hash('sha256', 'mk-mail|' . ($d['password'] ?? '') . '|' . ($d['database'] ?? ''), true);
    }

    public static function enc(string $plain): string
    {
        $iv = random_bytes(16);
        return 'enc:' . base64_encode($iv . openssl_encrypt($plain, 'aes-256-cbc', self::secretKey(), OPENSSL_RAW_DATA, $iv));
    }

    public static function dec(string $stored): string
    {
        if (strncmp($stored, 'enc:', 4) !== 0) {
            return $stored;
        }
        $raw = base64_decode(substr($stored, 4), true);
        if ($raw === false || strlen($raw) < 17) {
            return '';
        }
        $out = openssl_decrypt(substr($raw, 16), 'aes-256-cbc', self::secretKey(), OPENSSL_RAW_DATA, substr($raw, 0, 16));
        return $out === false ? '' : $out;
    }

    /** @return array{host:string,port:int,user:string,pass:string,crypto:string,from:string,from_name:string} */
    public static function smtpConf(): array
    {
        return [
            'host'      => self::cfgGet('smtp_host'),
            'port'      => (int) (self::cfgGet('smtp_port') ?: 587),
            'user'      => self::cfgGet('smtp_user'),
            'pass'      => self::dec(self::cfgGet('smtp_pass')),
            'crypto'    => self::cfgGet('smtp_crypto'),
            'from'      => self::cfgGet('mail_from'),
            'from_name' => self::cfgGet('mail_from_name'),
        ];
    }

    /** 관리자 SMTP 가 설정돼 있는지 — 없으면 대량 발송은 막는 게 낫다 */
    public static function configured(): bool
    {
        return self::cfgGet('smtp_host') !== '';
    }

    /**
     * 텍스트 메일 한 통. 실패해도 예외를 던지지 않는다.
     * @param  list<string> $to
     * @return array{0:bool,1:string}  [성공 여부, 실패 사유]
     */
    public static function send(array $to, string $subject, string $body): array
    {
        try {
            $cfg   = config('Email');
            $email = \Config\Services::email();
            $m     = self::smtpConf();
            if ($m['host'] !== '') {
                $email->initialize([
                    'protocol'    => 'smtp',
                    'SMTPHost'    => $m['host'],
                    'SMTPPort'    => $m['port'],
                    'SMTPUser'    => $m['user'],
                    'SMTPPass'    => $m['pass'],
                    'SMTPCrypto'  => $m['crypto'],
                    'SMTPTimeout' => 12,
                    'mailType'    => 'text',
                    'charset'     => 'UTF-8',
                    'newline'     => "\r\n",
                    'CRLF'        => "\r\n",
                    'wordWrap'    => false,
                ]);
            }
            $email->clear(true);
            if ($m['host'] !== '') {
                $email->setFrom($m['from'] ?: $m['user'], $m['from_name'] ?: 'MAKENOV');
            } else {
                $email->setFrom($cfg->fromEmail ?: 'no-reply@makenov.com', $cfg->fromName ?: 'MAKENOV');
            }
            $email->setTo($to);
            $email->setSubject($subject);
            $email->setMessage($body);
            $ok = (bool) $email->send(false);
            return [$ok, $ok ? '' : trim(strip_tags((string) $email->printDebugger(['headers'])))];
        } catch (\Throwable $e) {
            return [false, $e->getMessage()];
        }
    }
}
