<?php

namespace App\Models;

use CodeIgniter\Model;

class HeroSlidesModel extends Model
{
    protected $table            = 'hero_slides';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'art', 'link', 'kicker', 'title', 'sub', 'sort', 'active'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
