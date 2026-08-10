<?php

namespace App\Models;

use CodeIgniter\Model;

class CompaniesModel extends Model
{
    protected $table            = 'companies';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'brand', 'cat', 'name', 'tagline', 'intro', 'location', 'since', 'staff', 'export', 'brn', 'ceo', 'tel', 'site', 'certs', 'moq_policy', 'logo', 'cover', 'sort'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
