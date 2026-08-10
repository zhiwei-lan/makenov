<?php

namespace App\Models;

use CodeIgniter\Model;

class InquiriesModel extends Model
{
    protected $table            = 'inquiries';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'product_id', 'buyer_id', 'message', 'status', 'memo'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
