<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Faker\Factory as Faker;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create();

        // Get all companies
        $companies = User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No company users found. Please run DefaultCompanySeeder first.');
            return;
        }

        // Department names with descriptions and parent relationships (single root hierarchy)
        $departments = [
            // Root Department
            ['name' => 'Corporate', 'description' => 'Main corporate department overseeing all organizational functions', 'parent_id' => null],

            // Level 1: Core Business Functions (9 departments total)
            ['name' => 'Human Resources', 'description' => 'Manages employee relations, recruitment, training, benefits administration, and organizational development', 'parent_id' => 1],
            ['name' => 'Finance & Accounting', 'description' => 'Handles financial planning, budgeting, accounting, financial reporting, and compliance with financial regulations', 'parent_id' => 1],
            ['name' => 'Information Technology', 'description' => 'Responsible for managing IT infrastructure, software development, system maintenance, and technical support', 'parent_id' => 1],
            ['name' => 'Operations', 'description' => 'Oversees daily business operations, process optimization, quality control, and operational efficiency', 'parent_id' => 1],
            ['name' => 'Marketing', 'description' => 'Develops marketing strategies, manages brand promotion, digital marketing campaigns, and market research', 'parent_id' => 1],
            ['name' => 'Sales', 'description' => 'Focuses on revenue generation, client acquisition, customer relationship management, and sales target achievement', 'parent_id' => 1],
            ['name' => 'Customer Service', 'description' => 'Provides customer support, handles inquiries and complaints, and ensures customer satisfaction and retention', 'parent_id' => 1],
            ['name' => 'Research & Development', 'description' => 'Conducts research, develops new products and services, innovation management, and technology advancement', 'parent_id' => 1],
            ['name' => 'Administration', 'description' => 'Handles administrative functions, office management, documentation, and general administrative support services', 'parent_id' => 1],
        ];

        foreach ($companies as $company) {
            // Get all branches for this company
            $branches = Branch::where('created_by', $company->id)->get();

            if ($branches->isEmpty()) {
                $this->command->warn('No branches found for company: ' . $company->name . '. Please run BranchSeeder first.');
                continue;
            }

            foreach ($branches as $branch) {
                // Track department IDs for this branch (keyed by array index)
                $departmentIds = [];

                // Create departments in the order they appear in the array
                // (parents are defined before their children)
                foreach ($departments as $index => $department) {
                    $departmentName = $department['name'];
                    $departmentDescription = $department['description'];

                    // Check if department already exists for this branch
                    if (Department::where('name', $departmentName)->where('branch_id', $branch->id)->exists()) {
                        continue;
                    }

                    // Determine parent ID
                    $parentId = null;
                    if ($department['parent_id'] !== null) {
                        $parentIndex = $department['parent_id'] - 1; // Convert to 0-based index
                        $parentName = $departments[$parentIndex]['name'];
                        $parentId = $departmentIds[$parentName] ?? null;

                        if (!$parentId) {
                            $this->command->warn('Parent department not found for: ' . $departmentName . ' in branch: ' . $branch->name . '. Skipping...');
                            continue;
                        }
                    }

                    try {
                        $createdDept = Department::create([
                            'name' => $departmentName,
                            'branch_id' => $branch->id,
                            'description' => $departmentDescription,
                            'parent_id' => $parentId,
                            'status' => 'active',
                            'created_by' => $company->id,
                        ]);

                        // Store the created department ID
                        $departmentIds[$departmentName] = $createdDept->id;
                    } catch (\Exception $e) {
                        $this->command->error('Failed to create department: ' . $departmentName . ' for branch: ' . $branch->name);
                        continue;
                    }
                }
            }
        }

        $this->command->info('Department seeder completed successfully!');
    }
}
