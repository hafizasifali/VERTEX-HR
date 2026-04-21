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
        Schema::table('leave_applications', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
            
            $table->foreignId('manager_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('manager_status')->default('pending');
            $table->timestamp('manager_approved_at')->nullable();
            
            $table->foreignId('hr_person_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('hr_status')->default('pending');
            $table->timestamp('hr_approved_at')->nullable();
            $table->text('hr_comments')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('leave_applications', function (Blueprint $table) {
            $table->dropForeign(['manager_id']);
            $table->dropColumn(['manager_id', 'manager_status', 'manager_approved_at']);
            $table->dropForeign(['hr_person_id']);
            $table->dropColumn(['hr_person_id', 'hr_status', 'hr_approved_at', 'hr_comments']);
        });
    }
};
