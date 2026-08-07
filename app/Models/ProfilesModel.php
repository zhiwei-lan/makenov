<?php

namespace App\Models;

use CodeIgniter\Model;

class ProfilesModel extends Model
{
    protected $table            = 'profiles';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'email', 'country', 'company', 'address', 'reg_no', 'verified_by', 'verify_note', 'status', 'tier', 'contact_name', 'position', 'messenger', 'phone'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
