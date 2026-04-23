<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use App\Models\LeavePolicy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class LeaveApplicationController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-leave-applications')) {
            $query = LeaveApplication::with(['employee', 'leaveType', 'leavePolicy', 'approver', 'creator', 'manager', 'hrPerson'])
                ->where(function ($q) {
                    if (Auth::user()->hasRole(['hr', 'company'])) {
                        // HR/Admin: see all company leave applications
                        $q->whereIn('leave_applications.created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->hasRole('manager')) {
                        // Manager: see ONLY their own leaves AND leaves where they are the assigned manager
                        $q->where(function ($subQ) {
                            $subQ->where('employee_id', Auth::id())
                                 ->orWhere('manager_id', Auth::id())
                                 ->orWhere('created_by', Auth::id());
                        });
                    } else {
                        // Regular employee: see only their own leave applications
                        $q->where(function ($subQ) {
                            $subQ->where('employee_id', Auth::id())
                                 ->orWhere('created_by', Auth::id());
                        });
                    }
                });


            // Handle search
            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('reason', 'like', '%' . $request->search . '%')
                        ->orWhereHas('employee', function ($subQ) use ($request) {
                            $subQ->where('name', 'like', '%' . $request->search . '%');
                        })
                        ->orWhereHas('leaveType', function ($subQ) use ($request) {
                            $subQ->where('name', 'like', '%' . $request->search . '%');
                        });
                });
            }

            // Handle employee filter
            if ($request->has('employee_id') && !empty($request->employee_id) && $request->employee_id !== 'all') {
                $query->where('employee_id', $request->employee_id);
            }

            // Handle leave type filter
            if ($request->has('leave_type_id') && !empty($request->leave_type_id) && $request->leave_type_id !== 'all') {
                $query->where('leave_type_id', $request->leave_type_id);
            }

            // Handle status filter
            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Handle sorting
            if ($request->has('sort_field') && !empty($request->sort_field)) {
                $query->orderBy($request->sort_field, $request->sort_direction ?? 'asc');
            } else {
                $query->orderBy('id', 'desc');
            }

            $leaveApplications = $query->paginate($request->per_page ?? 10);

            return Inertia::render('hr/leave-applications/index', [
                'leaveApplications' => $leaveApplications,
                'employees' => $this->getFilteredEmployees(),
                'leaveTypes' => LeaveType::whereIn('created_by', getCompanyAndUsersId())
                    ->where('status', 'active')
                    ->get(['id', 'name', 'color']),
                'filters' => $request->all(['search', 'employee_id', 'leave_type_id', 'status', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    private function getFilteredEmployees()
    {
        // Get employees for filter dropdown
        $employeeQuery = Employee::whereIn('created_by', getCompanyAndUsersId());

        if ((Auth::user()->hasRole('manager') || Auth::user()->can('manage-own-leave-applications')) && 
            !(Auth::user()->hasRole(['hr', 'company']) || Auth::user()->can('manage-any-leave-applications'))) {
            $employeeQuery->where(function ($q) {
                // Return employee themselves or their direct reports
                $q->where('user_id', Auth::id())
                  ->orWhere('manager_id', Auth::id());
            });
        }

        $userIds = $employeeQuery->pluck('user_id');

        $employees = User::with(['employee.manager'])
            ->whereIn('id', $userIds)
            ->where('status', 'active')
            ->select('id', 'name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'employee_id' => $user->employee->employee_id ?? '',
                    'manager_name' => $user->employee->manager->name ?? __('No Manager'),
                ];
            });
        return $employees;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string',
            'attachment' => 'nullable|string',
        ]);

        $validated['created_by'] = creatorId();

        // Calculate total days
        $startDate = Carbon::parse($validated['start_date']);
        $endDate = Carbon::parse($validated['end_date']);
        $validated['total_days'] = $startDate->diffInDays($endDate) + 1;

        // Get leave policy
        $leavePolicy = LeavePolicy::where('leave_type_id', $validated['leave_type_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->first();

        if (!$leavePolicy) {
            return redirect()->back()->with('error', __('No active policy found for selected leave type.'));
        }

        $validated['leave_policy_id'] = $leavePolicy->id;

        // Find Reporting Manager
        $employee = Employee::where('user_id', $validated['employee_id'])->first();
        $validated['manager_id'] = $employee ? $employee->manager_id : null;

        // Set initial statuses
        if ($leavePolicy->requires_approval) {
            if ($validated['manager_id']) {
                $validated['status'] = 'pending_manager';
                $validated['manager_status'] = 'pending';
                $validated['hr_status'] = 'pending';
            } else {
                // No manager? Go straight to HR
                $validated['status'] = 'pending_hr';
                $validated['manager_status'] = 'approved'; // Mark as auto-approved due to no manager
                $validated['hr_status'] = 'pending';
            }
        } else {
            $validated['status'] = 'approved';
            $validated['manager_status'] = 'approved';
            $validated['hr_status'] = 'approved';
        }

        $leaveApplication = LeaveApplication::create($validated);

        if ($leaveApplication->status === 'approved') {
            $leaveApplication->createAttendanceRecords();
        }

        return redirect()->back()->with('success', __('Leave application created successfully.'));
    }

    public function update(Request $request, $leaveApplicationId)
    {
        $leaveApplication = LeaveApplication::where('id', $leaveApplicationId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$leaveApplication) {
            return redirect()->back()->with('error', __('Leave application Not Found.'));
        }

        if ($leaveApplication->status !== 'pending' && $leaveApplication->status !== 'pending_manager') {
            return redirect()->back()->with('error', __('Only pending applications can be edited.'));
        }

        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:users,id',
                'leave_type_id' => 'required|exists:leave_types,id',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'reason' => 'required|string',
                'attachment' => 'nullable|string',
            ]);

            $startDate = Carbon::parse($validated['start_date']);
            $endDate = Carbon::parse($validated['end_date']);
            $validated['total_days'] = $startDate->diffInDays($endDate) + 1;

            $leaveApplication->update($validated);

            return redirect()->back()->with('success', __('Leave application updated successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy($leaveApplicationId)
    {
        $leaveApplication = LeaveApplication::where('id', $leaveApplicationId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($leaveApplication) {
            $leaveApplication->delete();
            return redirect()->back()->with('success', __('Leave application deleted successfully'));
        }

        return redirect()->back()->with('error', __('Leave application Not Found.'));
    }

    public function updateStatus(Request $request, $leaveApplicationId)
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'manager_comments' => 'nullable|string',
        ]);

        $leaveApplication = LeaveApplication::where('id', $leaveApplicationId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$leaveApplication) {
            return redirect()->back()->with('error', __('Leave application Not Found.'));
        }

        $user = Auth::user();
        $isManager = $user->hasRole('manager') && ($leaveApplication->manager_id == $user->id);
        $isHR = $user->hasRole(['hr', 'company']);

        try {
            // Level 1: Manager Approval
            if ($leaveApplication->status === 'pending_manager') {
                if (!$isManager) {
                    return redirect()->back()->with('error', __('Only the assigned reporting manager can perform this action at this stage.'));
                }

                $leaveApplication->update([
                    'manager_status' => $validated['status'],
                    'manager_approved_at' => now(),
                    'manager_comments' => $validated['manager_comments'],
                    'status' => 'pending_hr', // Always move to HR after manager decision
                ]);

                return redirect()->back()->with('success', __('Manager decision submitted. The application has been forwarded to HR for final review.'));
            }

            // Level 2: HR Approval
            if ($leaveApplication->status === 'pending_hr') {
                if (!$isHR) {
                    return redirect()->back()->with('error', __('Only HR personnel can perform final approval at this stage.'));
                }

                $hrStatus = $validated['status'];
                // Overall status is approved ONLY if BOTH manager and HR approve
                $finalStatus = ($hrStatus === 'approved' && $leaveApplication->manager_status === 'approved') ? 'approved' : 'rejected';

                if ($finalStatus === 'approved') {
                    // Double-check balance
                    $currentYear = now()->year;
                    $leaveBalance = \App\Models\LeaveBalance::where('employee_id', $leaveApplication->employee_id)
                        ->where('leave_type_id', $leaveApplication->leave_type_id)
                        ->where('year', $currentYear)
                        ->first();

                    if ($leaveBalance && $leaveBalance->remaining_days < $leaveApplication->total_days) {
                        return redirect()->back()->with('error', __('Insufficient leave balance.'));
                    }

                    $leaveApplication->update([
                        'hr_status' => 'approved',
                        'hr_approved_at' => now(),
                        'hr_comments' => $validated['manager_comments'], // Reusing the comments field from request
                        'hr_person_id' => $user->id,
                        'status' => 'approved',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);

                    $leaveApplication->createAttendanceRecords();
                    return redirect()->back()->with('success', __('Leave application has been fully approved.'));
                } else {
                    $leaveApplication->update([
                        'hr_status' => $hrStatus,
                        'hr_approved_at' => now(),
                        'hr_comments' => $validated['manager_comments'],
                        'hr_person_id' => $user->id,
                        'status' => 'rejected',
                    ]);
                    return redirect()->back()->with('success', __('Leave application has been rejected by HR.'));
                }
            }

            // Legacy support or direct approval (if status was 'pending')
            if ($leaveApplication->status === 'pending') {
                 $leaveApplication->update([
                    'status' => $validated['status'],
                    'manager_comments' => $validated['manager_comments'],
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                    'manager_status' => $validated['status'],
                    'hr_status' => $validated['status'],
                ]);

                if ($validated['status'] === 'approved') {
                    $leaveApplication->createAttendanceRecords();
                }

                return redirect()->back()->with('success', __('Status updated.'));
            }

            return redirect()->back()->with('error', __('Invalid status transition.'));

        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}
