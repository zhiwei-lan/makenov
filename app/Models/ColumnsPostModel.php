<?php

namespace App\Models;

use CodeIgniter\Model;

class ColumnsPostModel extends Model
{
    protected $table            = 'columns_post';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'cat', 'title', 'excerpt', 'body', 'img', 'date', 'slug', 'seo_title', 'seo_desc', 'published'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
