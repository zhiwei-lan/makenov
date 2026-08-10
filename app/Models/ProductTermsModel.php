<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductTermsModel extends Model
{
    protected $table            = 'product_terms';
    protected $primaryKey       = 'product_id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['product_id', 'price', 'moq', 'lead', 'terms'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
