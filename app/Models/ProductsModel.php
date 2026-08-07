<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductsModel extends Model
{
    protected $table            = 'products';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'company_id', 'cat', 'brand', 'origin', 'name', 'tagline', 'brand_story', 'img', 'gallery', 'video', 'detail', 'inquiries', 'views', 'wish_count', 'featured', 'is_new', 'published'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
