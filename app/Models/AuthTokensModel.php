<?php

namespace App\Models;

use CodeIgniter\Model;

class AuthTokensModel extends Model
{
    protected $table            = 'auth_tokens';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = ['user_id', 'access_token', 'refresh_token', 'expires_at'];
    protected $useTimestamps    = true;
    protected $dateFormat       = 'datetime';
}
