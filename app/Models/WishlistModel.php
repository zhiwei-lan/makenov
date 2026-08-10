<?php

namespace App\Models;

use CodeIgniter\Model;

class WishlistModel extends Model
{
    protected $table            = 'wishlist';
    protected $primaryKey       = 'buyer_id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['buyer_id', 'product_id', 'buyer_id', 'product_id'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
