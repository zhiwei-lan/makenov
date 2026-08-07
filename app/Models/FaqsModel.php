<?php

namespace App\Models;

use CodeIgniter\Model;

class FaqsModel extends Model
{
    protected $table            = 'faqs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'page', 'q', 'a', 'sort', 'published'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
