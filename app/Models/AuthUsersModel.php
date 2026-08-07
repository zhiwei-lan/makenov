<?php

namespace App\Models;

use CodeIgniter\Model;

class AuthUsersModel extends Model
{
    protected $table            = 'auth_users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $allowedFields    = ['id', 'email', 'password_hash', 'email_confirmed_at'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
