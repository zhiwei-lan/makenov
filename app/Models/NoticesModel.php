<?php

namespace App\Models;

use CodeIgniter\Model;

class NoticesModel extends Model
{
    protected $table            = 'notices';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'title', 'body', 'date', 'cat', 'pinned', 'published'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
