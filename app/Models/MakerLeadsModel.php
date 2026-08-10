<?php

namespace App\Models;

use CodeIgniter\Model;

class MakerLeadsModel extends Model
{
    protected $table            = 'maker_leads';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'company', 'name', 'tel', 'email', 'site', 'cat', 'message', 'status', 'memo'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
