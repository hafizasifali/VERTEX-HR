<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'name',
        'branch_id',
        'manager_id',
        'parent_id',
        'employee_count',
        'active_employees',
        'open_employees',
        'description',
        'status',
        'created_by'
    ];

    /**
     * Get the branch that owns the department.
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the manager of the department.
     */
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Get the parent department.
     */
    public function parent()
    {
        return $this->belongsTo(Department::class, 'parent_id');
    }

    /**
     * Get the sub-departments.
     */
    public function children()
    {
        return $this->hasMany(Department::class, 'parent_id');
    }

    /**
     * Get the user who created the department.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the employees assigned to this department.
     */
    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function desginations()
    {
        return $this->hasMany(Designation::class,'department_id','id');
    }
}