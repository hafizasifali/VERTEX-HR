<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->unsignedBigInteger('manager_id')->nullable()->after('branch_id');
            $table->unsignedBigInteger('parent_id')->nullable()->after('manager_id');
            $table->integer('employee_count')->default(0)->after('parent_id');
            $table->integer('active_employees')->default(0)->after('employee_count');
            $table->integer('open_employees')->default(0)->after('active_employees');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn(['manager_id', 'parent_id', 'employee_count', 'active_employees', 'open_employees']);
        });
    }
};
