import Migration "migration";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Map "mo:core/Map";

import Principal "mo:core/Principal";
import Text "mo:core/Text";

// Fix for Issue #4300 (Canister initialization trap at commit e32e6d42 on June 3, 2024)
(with migration = Migration.run)
actor {
  // Authorization Mixin
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type Role = {
    #hrAdmin;
    #manager;
    #employee;
    #supervisor;
  };

  public type EmployeeStatus = {
    #active;
    #inactive;
    #terminated;
  };

  public type JobPostingStatus = {
    #open;
    #closed;
    #draft;
  };

  public type ApplicantStage = {
    #applied;
    #screening;
    #interview;
    #offer;
    #hired;
    #rejected;
  };

  public type TimeOffStatus = {
    #pending;
    #approved;
    #denied;
  };

  public type ShiftConflict = {
    employeeId : Text;
    existingShift : Shift;
    conflictingShift : Shift;
  };

  public type TimeOffRequest = {
    id : Text;
    employeeId : Text;
    timeOffType : Text;
    startDate : Int;
    endDate : Int;
    requestDate : Int;
    status : TimeOffStatus;
    approverComments : ?Text;
  };

  public type User = {
    displayName : Text;
    username : Text;
    passwordHash : Text;
    role : Role;
    active : Bool;
  };

  public type UserProfile = {
    username : Text;
    role : Role;
    employeeId : ?Text;
  };

  public type Employee = {
    id : Text;
    fullName : Text;
    email : Text;
    phone : Text;
    department : Text;
    jobTitle : Text;
    startDate : Int;
    role : Role;
    status : EmployeeStatus;
    badgeId : Text;
    directManagerId : ?Text;
  };

  public type JobPosting = {
    id : Text;
    title : Text;
    department : Text;
    description : Text;
    status : JobPostingStatus;
  };

  public type Applicant = {
    id : Text;
    name : Text;
    contact : Text;
    resumeNotes : Text;
    appliedDate : Int;
    stage : ApplicantStage;
    jobPostingId : Text;
  };

  public type ShiftStatus = {
    #draft;
    #published;
  };

  public type Shift = {
    id : Text;
    employeeId : Text;
    date : Int;
    startTime : Int;
    endTime : Int;
    department : Text;
    status : ShiftStatus;
  };

  public type PTOPolicy = {
    id : Text;
    name : Text;
    accrualRate : Float;
    maxCarryOver : Float;
    eligibleLeaveTypes : [Text];
  };

  public type PTOBalance = {
    employeeId : Text;
    policyId : Text;
    balance : Float;
  };

  public type ServiceResult<T> = {
    #ok : T;
    #err : Text;
  };

  // Input type for atomically creating an employee with a login account
  public type CreateEmployeeWithAccountInput = {
    profile : Employee;
    username : Text;
    passwordHash : Text;
    displayName : Text;
    directManagerId : ?Text;
  };

  // Timesheet data structures
  public type TimesheetStatus = {
    #submitted;
    #managerApproved;
    #managerDenied;
    #hrApproved;
    #hrDenied;
  };

  public type TimesheetEntry = {
    date : Text;
    startTime : Text;
    endTime : Text;
    hoursWorked : Float;
  };

  public type Timesheet = {
    id : Text;
    employeeId : Text;
    employeeUsername : Text;
    entries : [TimesheetEntry];
    totalHours : Float;
    status : TimesheetStatus;
    submittedAt : Int;
    managerComment : ?Text;
    hrComment : ?Text;
    weekStartDate : Text;
  };

  let timesheets = Map.empty<Text, Timesheet>();

  let users = Map.empty<Text, User>();
  let employees = Map.empty<Text, Employee>();
  let jobPostings = Map.empty<Text, JobPosting>();
  let applicants = Map.empty<Text, Applicant>();
  let shifts = Map.empty<Text, Shift>();
  let timeOffRequests = Map.empty<Text, TimeOffRequest>();
  let ptoPolicies = Map.empty<Text, PTOPolicy>();
  let ptoBalances = Map.empty<Text, PTOBalance>();

  let userProfiles = Map.empty<Principal, UserProfile>();
  let principalToUsername = Map.empty<Principal, Text>();

  // Maps employeeId -> username for badge-based login lookup
  let employeeIdToUsername = Map.empty<Text, Text>();

  // Ensure hardcoded HR admin accounts always exist
  func ensureHardcodedAdmins() {
    users.add(
      "richaadi0",
      {
        displayName = "Rich";
        username = "richaadi0";
        passwordHash = "3vtpxdgf";
        role = #hrAdmin;
        active = true;
      },
    );
    users.add(
      "Adirich",
      {
        displayName = "IU";
        username = "Adirich";
        passwordHash = "3vtpxdgf";
        role = #hrAdmin;
        active = true;
      },
    );
  };

  // Call once at initialization and on each upgrade
  ensureHardcodedAdmins();

  // Helper: get the Role of the caller from the users map via principalToUsername
  func getCallerRole(caller : Principal) : ?Role {
    switch (principalToUsername.get(caller)) {
      case (null) { null };
      case (?username) {
        switch (users.get(username)) {
          case (null) { null };
          case (?user) { ?user.role };
        };
      };
    };
  };

  // Helper: check if caller is an hrAdmin or manager (for operations permitted to both)
  // Supervisors are intentionally excluded from write operations like creating employees,
  // job postings, hiring applicants, and terminating/deactivating employees.
  func isHRAdminOrManager(caller : Principal) : Bool {
    if (AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return true;
    };
    switch (getCallerRole(caller)) {
      case (null) { false };
      case (?role) {
        switch (role) {
          case (#hrAdmin) { true };
          case (#manager) { true };
          case (_) { false };
        };
      };
    };
  };

  // Helper: check if caller is an hrAdmin, manager, or supervisor
  // Used only for READ operations (view schedules, view time-off requests, view applicants)
  // and for approve/deny time-off requests (supervisors are explicitly allowed per spec).
  func isHRAdminOrManagerOrSupervisor(caller : Principal) : Bool {
    if (AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return true;
    };
    switch (getCallerRole(caller)) {
      case (null) { false };
      case (?role) {
        switch (role) {
          case (#hrAdmin) { true };
          case (#manager) { true };
          case (#supervisor) { true };
          case (_) { false };
        };
      };
    };
  };

  // Helper: check if caller is an hrAdmin (app-level)
  func isHRAdmin(caller : Principal) : Bool {
    if (AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return true;
    };
    switch (getCallerRole(caller)) {
      case (null) { false };
      case (?role) {
        switch (role) {
          case (#hrAdmin) { true };
          case (_) { false };
        };
      };
    };
  };

  // Helper: check if caller is authenticated (has a session)
  func isAuthenticated(caller : Principal) : Bool {
    if (AccessControl.hasPermission(accessControlState, caller, #user)) {
      return true;
    };
    switch (principalToUsername.get(caller)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  // Helper: determine if a shift is visible to the caller based on its status.
  // Draft shifts are only visible to HR Admins and Managers.
  // Published shifts are visible to all authenticated users.
  func isShiftVisibleToCaller(shift : Shift, caller : Principal) : Bool {
    switch (shift.status) {
      case (#published) { true };
      case (#draft) { isHRAdminOrManager(caller) };
    };
  };

  // ===== UserProfile Functions (required by frontend) =====

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can get their profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isHRAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can save their profile");
    };
    userProfiles.add(caller, profile);
  };

  // ===== User Authentication =====

  public shared ({ caller }) func login(username : Text, passwordHash : Text) : async ?UserProfile {
    switch (users.get(username)) {
      case (null) { null };
      case (?user) {
        // Case-sensitive credential matching
        if (user.passwordHash == passwordHash and user.username == username and user.active) {
          principalToUsername.add(caller, username);
          let profile : UserProfile = {
            username = user.username;
            role = user.role;
            employeeId = null;
          };
          userProfiles.add(caller, profile);
          ?profile;
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func validateSession(username : Text) : async Bool {
    switch (principalToUsername.get(caller)) {
      case (null) { false };
      case (?storedUsername) { storedUsername == username };
    };
  };

  // createAccount:
  // - HR Admins can create accounts with any role (#hrAdmin, #manager, #supervisor, #employee).
  // - Managers can create accounts but may only assign #employee or #manager roles.
  //   Managers cannot assign #hrAdmin or #supervisor roles.
  // - All other roles are unauthorized.
  public shared ({ caller }) func createAccount(displayName : Text, username : Text, passwordHash : Text, role : Role) : async () {
    if (isHRAdmin(caller)) {
      // HR Admin can assign any role — no restriction
    } else if (isHRAdminOrManager(caller)) {
      // Manager: may only assign #employee or #manager
      switch (role) {
        case (#employee) { /* allowed */ };
        case (#manager) { /* allowed */ };
        case (#hrAdmin) {
          Runtime.trap("Unauthorized: Managers cannot assign the HR Admin role");
        };
        case (#supervisor) {
          Runtime.trap("Unauthorized: Managers cannot assign the Supervisor role");
        };
      };
    } else {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can create accounts");
    };

    if (users.containsKey(username)) {
      Runtime.trap("Username already exists");
    };

    users.add(
      username,
      {
        displayName;
        username;
        passwordHash;
        role;
        active = true;
      },
    );
  };

  // setRole / updateAccountRole:
  // Only HR Admins may change a user account's role.
  public shared ({ caller }) func setRole(username : Text, role : Role) : async () {
    if (not isHRAdmin(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins can change user roles");
    };
    switch (users.get(username)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        users.add(
          username,
          {
            user with
            role = role;
          },
        );
      };
    };
  };

  // ===== Timesheet Management =====

  public shared ({ caller }) func submitTimesheet(timesheet : Timesheet) : async ServiceResult<Text> {
    // Employees only can submit timesheets
    switch (getCallerRole(caller)) {
      case (?#employee) {
        timesheets.add(timesheet.id, { timesheet with status = #submitted });
        #ok("Timesheet submitted successfully");
      };
      case (_) {
        #err("Only employees can submit timesheets");
      };
    };
  };

  public query ({ caller }) func getTimesheets() : async [Timesheet] {
    // HR Admin (view all), Manager (department/team), Employee (self)
    switch (getCallerRole(caller)) {
      case (?role) {
        switch (role) {
          case (#hrAdmin) {
            timesheets.values().toArray();
          };
          case (#manager) {
            // Only return manager's department or team timesheets
            let callerManagerId = switch (userProfiles.get(caller)) {
              case (?profile) { ?profile.username };
              case (null) { null };
            };

            switch (callerManagerId) {
              case (?managerId) {
                let managedEmployees = employees.values().toArray().filter(
                  func(employee) {
                    switch (employee.directManagerId) {
                      case (?empManagerId) { empManagerId == managerId };
                      case (null) { false };
                    };
                  }
                );

                let managedEmployeeIds = managedEmployees.map(func(e) { e.id });

                timesheets.values().toArray().filter(
                  func(ts) {
                    managedEmployeeIds.find(
                      func(id) { id == ts.employeeId }
                    ) != null;
                  }
                );
              };
              case (null) { timesheets.values().toArray().filter(func(_) { false }) };
            };
          };
          case (#employee) {
            let timesheetsArray = timesheets.values().toArray();
            let employeeTimesheets = timesheetsArray.filter(
              func(ts) {
                switch (userProfiles.get(caller)) {
                  case (?profile) {
                    profile.username == ts.employeeUsername;
                  };
                  case (null) { false };
                };
              }
            );
            employeeTimesheets;
          };
          case (_) { timesheets.values().toArray().filter(func(_) { false }) };
        };
      };
      case (null) { timesheets.values().toArray().filter(func(_) { false }) };
    };
  };

  public shared ({ caller }) func managerReviewTimesheet(id : Text, approved : Bool, comment : Text) : async ServiceResult<Text> {
    switch (getCallerRole(caller)) {
      case (?role) {
        switch (role) {
          case (#hrAdmin) { () };
          case (#manager) { () };
          case (_) { return #err("Only HR Admins and Managers can review timesheets") };
        };
        switch (timesheets.get(id)) {
          case (null) {
            #err("Timesheet not found");
          };
          case (?timesheet) {
            if (timesheet.status == #submitted) {
              timesheets.add(
                id,
                {
                  timesheet with
                  status = if (approved) { #managerApproved } else { #managerDenied };
                  managerComment = ?comment;
                },
              );
              #ok("Timesheet review saved successfully");
            } else {
              #err("Timesheet must be in Submitted status for review");
            };
          };
        };
      };
      case (null) { #err("Only HR Admins and Managers can review timesheets") };
    };
  };

  public shared ({ caller }) func hrReviewTimesheet(id : Text, approved : Bool, comment : Text) : async ServiceResult<Text> {
    if (not isHRAdmin(caller)) { return #err("Only HR Admins can perform final review") };

    switch (timesheets.get(id)) {
      case (null) {
        #err("Timesheet not found");
      };
      case (?timesheet) {
        if (timesheet.status == #managerApproved) {
          timesheets.add(
            id,
            {
              timesheet with
              status = if (approved) { #hrApproved } else { #hrDenied };
              hrComment = ?comment;
            },
          );
          #ok("Timesheet HR review saved successfully");
        } else {
          #err("Timesheet must be in Manager Approved status for HR review");
        };
      };
    };
  };

  // ===== Employee Management Functions =====

  // createEmployee: HR Admins and Managers can create employees.
  // Supervisors cannot add new employees.
  // This legacy endpoint creates only the employee profile (no account).
  // Prefer createEmployeeWithAccount for atomic creation.
  public shared ({ caller }) func createEmployee(profile : Employee) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can create employees");
    };
    employees.add(profile.id, profile);
  };

  // createEmployeeWithAccount: Atomically creates both an Employee and a login account.
  // Required fields: profile (Employee), username, passwordHash, displayName.
  // Returns an error (via trap) if the username is already taken or required fields are missing.
  // Only HR Admins and Managers can call this endpoint.
  // Managers follow the same role restriction as createAccount: cannot assign #hrAdmin or #supervisor.
  public shared ({ caller }) func createEmployeeWithAccount(input : CreateEmployeeWithAccountInput) : async () {
    if (isHRAdmin(caller)) {
      // HR Admin can assign any role — no restriction
    } else if (isHRAdminOrManager(caller)) {
      // Manager: may only assign #employee or #manager to the new account
      switch (input.profile.role) {
        case (#employee) { /* allowed */ };
        case (#manager) { /* allowed */ };
        case (#hrAdmin) {
          Runtime.trap("Unauthorized: Managers cannot assign the HR Admin role");
        };
        case (#supervisor) {
          Runtime.trap("Unauthorized: Managers cannot assign the Supervisor role");
        };
      };
    } else {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can create employees");
    };

    // Validate required fields
    if (input.username.size() == 0) {
      Runtime.trap("Username is required");
    };
    if (input.passwordHash.size() == 0) {
      Runtime.trap("Password is required");
    };
    if (input.profile.id.size() == 0) {
      Runtime.trap("Employee ID is required");
    };
    if (input.profile.fullName.size() == 0) {
      Runtime.trap("Employee full name is required");
    };

    // Check for duplicate username — must fail atomically before creating any record
    if (users.containsKey(input.username)) {
      Runtime.trap("Username already exists: " # input.username);
    };

    // Check for duplicate employee ID
    if (employees.containsKey(input.profile.id)) {
      Runtime.trap("Employee ID already exists: " # input.profile.id);
    };

    // Atomically create both records (Motoko is single-threaded; both writes happen before any await)
    employees.add(
      input.profile.id,
      {
        input.profile with
        directManagerId = input.directManagerId;
      },
    );

    users.add(
      input.username,
      {
        displayName = input.displayName;
        username = input.username;
        passwordHash = input.passwordHash;
        role = input.profile.role;
        active = true;
      },
    );

    // Store the employeeId -> username mapping for badge-based login
    employeeIdToUsername.add(input.profile.id, input.username);
  };

  public query ({ caller }) func getEmployee(id : Text) : async Employee {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view employee profiles");
    };
    switch (employees.get(id)) {
      case (null) { Runtime.trap("Employee not found") };
      case (?profile) { profile };
    };
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view employees");
    };
    employees.values().toArray();
  };

  public shared ({ caller }) func updateEmployee(id : Text, profile : Employee) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can update employees");
    };
    employees.add(id, profile);
  };

  // deactivateEmployee: HR Admins and Managers only. Supervisors cannot deactivate employees.
  public shared ({ caller }) func deactivateEmployee(id : Text) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can deactivate employees");
    };
    switch (employees.get(id)) {
      case (null) { Runtime.trap("Employee not found") };
      case (?profile) {
        let updatedProfile = {
          id = profile.id;
          fullName = profile.fullName;
          email = profile.email;
          phone = profile.phone;
          department = profile.department;
          jobTitle = profile.jobTitle;
          startDate = profile.startDate;
          role = profile.role;
          status = #inactive;
          badgeId = profile.badgeId;
          directManagerId = profile.directManagerId;
        };
        employees.add(id, updatedProfile);
      };
    };
  };

  // deleteEmployee: HR Admins and Managers only. Supervisors cannot terminate/delete employees.
  public shared ({ caller }) func deleteEmployee(id : Text) : async ServiceResult<()> {
    if (not isHRAdminOrManager(caller)) {
      return #err("Unauthorized: Only HR Admins or Managers can delete employees");
    };
    switch (employees.get(id)) {
      case (null) { #err("Employee not found: " # id) };
      case (?_) {
        employees.remove(id);
        // Also clean up the employeeId -> username mapping if present
        employeeIdToUsername.remove(id);
        #ok(());
      };
    };
  };

  // getEmployeeByBadgeId: Any authenticated user may look up an employee by badge ID.
  // This is a query (read-only) endpoint.
  public query ({ caller }) func getEmployeeByBadgeId(badgeId : Text) : async ServiceResult<Employee> {
    if (not isAuthenticated(caller)) {
      return #err("Unauthorized: Only authenticated users can view employee profiles");
    };
    switch (employees.values().find(func(e : Employee) : Bool { e.badgeId == badgeId })) {
      case (null) { #err("Employee not found for badge ID: " # badgeId) };
      case (?profile) { #ok(profile) };
    };
  };

  // loginWithBadgeId: No authentication required (this IS the login endpoint).
  // Looks up the employee by badge ID, finds their linked user account via
  // the employeeIdToUsername map, and returns session data identical to login().
  public shared ({ caller }) func loginWithBadgeId(badgeId : Text) : async ServiceResult<UserProfile> {
    // Step 1: Find the employee with this badge ID
    switch (employees.values().find(func(e : Employee) : Bool { e.badgeId == badgeId })) {
      case (null) {
        #err("No employee found with badge ID: " # badgeId);
      };
      case (?emp) {
        // Step 2: Find the linked username via employeeIdToUsername map
        switch (employeeIdToUsername.get(emp.id)) {
          case (null) {
            #err("No linked user account found for employee: " # emp.id);
          };
          case (?username) {
            // Step 3: Look up the user account
            switch (users.get(username)) {
              case (null) {
                #err("User account not found for username: " # username);
              };
              case (?user) {
                if (not user.active) {
                  return #err("User account is inactive");
                };
                // Step 4: Establish session (same as login())
                principalToUsername.add(caller, username);
                let profile : UserProfile = {
                  username = user.username;
                  role = user.role;
                  employeeId = ?emp.id;
                };
                userProfiles.add(caller, profile);
                #ok(profile);
              };
            };
          };
        };
      };
    };
  };

  // ===== Job Postings Management =====
  // Supervisors cannot create job postings.

  public shared ({ caller }) func createJobPosting(posting : JobPosting) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can create job postings");
    };
    jobPostings.add(posting.id, posting);
  };

  public shared ({ caller }) func updateJobPosting(id : Text, posting : JobPosting) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can update job postings");
    };
    jobPostings.add(id, posting);
  };

  public query ({ caller }) func getJobPosting(id : Text) : async JobPosting {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view job postings");
    };
    switch (jobPostings.get(id)) {
      case (null) { Runtime.trap("Job posting not found") };
      case (?posting) { posting };
    };
  };

  public query ({ caller }) func getAllJobPostings() : async [JobPosting] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view job postings");
    };
    jobPostings.values().toArray();
  };

  // ===== Applicant Management =====
  // Supervisors cannot hire applicants or add/update applicant stages.

  public shared ({ caller }) func addApplicant(applicant : Applicant) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can add applicants");
    };
    applicants.add(applicant.id, applicant);
  };

  public shared ({ caller }) func updateApplicantStage(id : Text, stage : ApplicantStage) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can update applicant stage");
    };
    switch (applicants.get(id)) {
      case (null) { Runtime.trap("Applicant not found") };
      case (?applicant) {
        let updatedApplicant = {
          id = applicant.id;
          name = applicant.name;
          contact = applicant.contact;
          resumeNotes = applicant.resumeNotes;
          appliedDate = applicant.appliedDate;
          stage;
          jobPostingId = applicant.jobPostingId;
        };
        applicants.add(id, updatedApplicant);
      };
    };
  };

  // Supervisors can view applicants (read-only).
  public query ({ caller }) func getApplicant(id : Text) : async Applicant {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can view applicant details");
    };
    switch (applicants.get(id)) {
      case (null) { Runtime.trap("Applicant not found") };
      case (?applicant) { applicant };
    };
  };

  public query ({ caller }) func getAllApplicants() : async [Applicant] {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can view applicant details");
    };
    applicants.values().toArray();
  };

  public query ({ caller }) func getApplicantsForPosting(jobPostingId : Text) : async [Applicant] {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can view applicants for a posting");
    };
    applicants.values().toArray().filter(func(a : Applicant) : Bool { a.jobPostingId == jobPostingId });
  };

  // ===== Shift Management =====
  // Supervisors can VIEW published schedules but cannot assign or delete shifts.
  // Draft shifts are only visible to HR Admins and Managers.
  // Published shifts are visible to all authenticated users including Employees and Supervisors.

  // assignShift: HR Admins and Managers only. Supervisors cannot assign shifts.
  // New shifts are created with #draft status by default if not specified.
  public shared ({ caller }) func assignShift(shift : Shift) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can assign shifts");
    };
    shifts.add(shift.id, shift);
  };

  // deleteShift: HR Admins and Managers only. Supervisors cannot delete shifts.
  public shared ({ caller }) func deleteShift(id : Text) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can delete shifts");
    };
    shifts.remove(id);
  };

  // publishSchedule: Transitions all draft shifts for a given department and week
  // (identified by a weekStart timestamp) to published status.
  // Only HR Admins and Managers can publish schedules.
  public shared ({ caller }) func publishSchedule(department : Text, weekStart : Int) : async ServiceResult<Nat> {
    if (not isHRAdminOrManager(caller)) {
      return #err("Unauthorized: Only HR Admins or Managers can publish schedules");
    };
    // weekStart is the start of the week (e.g., Monday 00:00 UTC in nanoseconds).
    // weekEnd is 7 days later.
    let weekEnd = weekStart + 7 * 24 * 60 * 60 * 1_000_000_000;
    var count = 0;
    for ((id, shift) in shifts.entries()) {
      if (
        shift.department == department and
        shift.date >= weekStart and
        shift.date < weekEnd and
        shift.status == #draft
      ) {
        shifts.add(id, { shift with status = #published });
        count += 1;
      };
    };
    #ok(count);
  };

  // unpublishSchedule: Reverts all published shifts for a given department and week
  // back to draft status.
  // Only HR Admins and Managers can unpublish schedules.
  public shared ({ caller }) func unpublishSchedule(department : Text, weekStart : Int) : async ServiceResult<Nat> {
    if (not isHRAdminOrManager(caller)) {
      return #err("Unauthorized: Only HR Admins or Managers can unpublish schedules");
    };
    let weekEnd = weekStart + 7 * 24 * 60 * 60 * 1_000_000_000;
    var count = 0;
    for ((id, shift) in shifts.entries()) {
      if (
        shift.department == department and
        shift.date >= weekStart and
        shift.date < weekEnd and
        shift.status == #published
      ) {
        shifts.add(id, { shift with status = #draft });
        count += 1;
      };
    };
    #ok(count);
  };

  public query ({ caller }) func hasConflictingShift(newShift : Shift) : async Bool {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can check shift conflicts");
    };

    switch (
      shifts.values().find(
        func(existingShift : Shift) : Bool {
          existingShift.employeeId == newShift.employeeId and existingShift.id != newShift.id and (
            (newShift.startTime >= existingShift.startTime and newShift.startTime < existingShift.endTime) or
            (newShift.endTime > existingShift.startTime and newShift.endTime <= existingShift.endTime) or
            (
              if (newShift.endTime <= newShift.startTime) {
                let adjustedEnd = newShift.endTime + 24 * 60;
                (newShift.startTime >= existingShift.startTime and newShift.startTime < existingShift.endTime) or (
                  adjustedEnd > existingShift.startTime and adjustedEnd <= existingShift.endTime
                );
              } else { false }
            )
          );
        }
      )
    ) {
      case (null) { false };
      case (?_) { true };
    };
  };

  // getAllShiftsForEmployee: Returns shifts for a given employee.
  // - HR Admins and Managers can see all shifts (draft and published).
  // - Supervisors can only see published shifts.
  // - Regular employees can only see their own published shifts.
  public query ({ caller }) func getAllShiftsForEmployee(employeeId : Text) : async [Shift] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view shifts");
    };

    // Employees can only view their own shifts
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      switch (userProfiles.get(caller)) {
        case (null) { Runtime.trap("Unauthorized: No profile found for caller") };
        case (?profile) {
          switch (profile.employeeId) {
            case (null) { Runtime.trap("Unauthorized: No employee record linked to your account") };
            case (?eid) {
              if (eid != employeeId) {
                Runtime.trap("Unauthorized: Can only view your own shifts");
              };
            };
          };
        };
      };
    };

    // Filter by employeeId and apply draft visibility rules
    shifts.values().toArray().filter(
      func(shift : Shift) : Bool {
        shift.employeeId == employeeId and isShiftVisibleToCaller(shift, caller)
      }
    );
  };

  // getAllShiftsForDepartment: Returns shifts for a given department.
  // - HR Admins and Managers can see all shifts (draft and published).
  // - Supervisors can only see published shifts.
  public query ({ caller }) func getAllShiftsForDepartment(department : Text) : async [Shift] {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can view department shifts");
    };
    shifts.values().toArray().filter(
      func(shift : Shift) : Bool {
        shift.department == department and isShiftVisibleToCaller(shift, caller)
      }
    );
  };

  // getAvailableShifts: Returns shifts for a given department.
  // - HR Admins and Managers can see all shifts (draft and published).
  // - All other authenticated users (supervisors, employees) can only see published shifts.
  public query ({ caller }) func getAvailableShifts(dep : Text) : async [Shift] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view available shifts");
    };
    shifts.values().toArray().filter(
      func(shift : Shift) : Bool {
        shift.department == dep and isShiftVisibleToCaller(shift, caller)
      }
    );
  };

  // ===== Time Off Requests Management =====
  // Supervisors can approve or deny time-off requests with a comment.
  // Supervisors can view all time-off requests.

  public shared ({ caller }) func submitTimeOffRequest(request : TimeOffRequest) : async () {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can submit time-off requests");
    };
    // Non-admin/manager employees can only submit for themselves
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      switch (userProfiles.get(caller)) {
        case (null) { Runtime.trap("Unauthorized: No profile found for caller") };
        case (?profile) {
          switch (profile.employeeId) {
            case (null) { Runtime.trap("Unauthorized: No employee record linked to your account") };
            case (?eid) {
              if (eid != request.employeeId) {
                Runtime.trap("Unauthorized: Can only submit time-off requests for yourself");
              };
            };
          };
        };
      };
    };
    switch (employees.get(request.employeeId)) {
      case (null) { Runtime.trap("Employee not found") };
      case (?_) {
        timeOffRequests.add(request.id, request);
      };
    };
  };

  // approveTimeOffRequest: HR Admins, Managers, and Supervisors can approve time-off requests.
  public shared ({ caller }) func approveTimeOffRequest(requestId : Text) : async () {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can approve time off requests");
    };
    switch (timeOffRequests.get(requestId)) {
      case (null) { Runtime.trap("TimeOffRequest not found") };
      case (?request) {
        let updatedRequest = {
          id = request.id;
          employeeId = request.employeeId;
          timeOffType = request.timeOffType;
          startDate = request.startDate;
          endDate = request.endDate;
          requestDate = request.requestDate;
          status = #approved;
          approverComments = ?"Approved";
        };
        timeOffRequests.add(requestId, updatedRequest);
      };
    };
  };

  // approveTimeOffRequestWithComment: HR Admins, Managers, and Supervisors can approve with a comment.
  public shared ({ caller }) func approveTimeOffRequestWithComment(requestId : Text, comment : Text) : async () {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can approve time off requests");
    };
    switch (timeOffRequests.get(requestId)) {
      case (null) { Runtime.trap("TimeOffRequest not found") };
      case (?request) {
        let updatedRequest = {
          id = request.id;
          employeeId = request.employeeId;
          timeOffType = request.timeOffType;
          startDate = request.startDate;
          endDate = request.endDate;
          requestDate = request.requestDate;
          status = #approved;
          approverComments = ?comment;
        };
        timeOffRequests.add(requestId, updatedRequest);
      };
    };
  };

  // denyTimeOffRequest: HR Admins, Managers, and Supervisors can deny time-off requests with a comment.
  public shared ({ caller }) func denyTimeOffRequest(requestId : Text, comments : Text) : async () {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can deny time off requests");
    };
    switch (timeOffRequests.get(requestId)) {
      case (null) { Runtime.trap("TimeOffRequest not found") };
      case (?request) {
        let updatedRequest = {
          id = request.id;
          employeeId = request.employeeId;
          timeOffType = request.timeOffType;
          startDate = request.startDate;
          endDate = request.endDate;
          requestDate = request.requestDate;
          status = #denied;
          approverComments = ?comments;
        };
        timeOffRequests.add(requestId, updatedRequest);
      };
    };
  };

  public query ({ caller }) func getAllTimeOffRequestsForEmployee(employeeId : Text) : async [TimeOffRequest] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view time-off requests");
    };
    // Non-admin/manager/supervisor employees can only view their own requests
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      switch (userProfiles.get(caller)) {
        case (null) { Runtime.trap("Unauthorized: No profile found for caller") };
        case (?profile) {
          switch (profile.employeeId) {
            case (null) { Runtime.trap("Unauthorized: No employee record linked to your account") };
            case (?eid) {
              if (eid != employeeId) {
                Runtime.trap("Unauthorized: Can only view your own time-off requests");
              };
            };
          };
        };
      };
    };
    timeOffRequests.values().toArray().filter(func(req : TimeOffRequest) : Bool { req.employeeId == employeeId });
  };

  // getAllTimeOffRequests: Supervisors can view all time-off requests.
  public query ({ caller }) func getAllTimeOffRequests() : async [TimeOffRequest] {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can view all time-off requests");
    };
    timeOffRequests.values().toArray();
  };

  // ===== PTO Balance Management =====
  // Supervisors cannot add or update PTO balances (write operations restricted to HR Admin/Manager).

  public shared ({ caller }) func addPTOBalance(balance : PTOBalance) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can add PTO balances");
    };
    ptoBalances.add(balance.employeeId, balance);
  };

  public shared ({ caller }) func updatePTOBalance(balance : PTOBalance) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can update PTO balances");
    };
    ptoBalances.add(balance.employeeId, balance);
  };

  public query ({ caller }) func getPTOBalance(employeeId : Text) : async PTOBalance {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view PTO balances");
    };
    // Non-admin/manager/supervisor employees can only view their own balance
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      switch (userProfiles.get(caller)) {
        case (null) { Runtime.trap("Unauthorized: No profile found for caller") };
        case (?profile) {
          switch (profile.employeeId) {
            case (null) { Runtime.trap("Unauthorized: No employee record linked to your account") };
            case (?eid) {
              if (eid != employeeId) {
                Runtime.trap("Unauthorized: Can only view your own PTO balance");
              };
            };
          };
        };
      };
    };
    switch (ptoBalances.get(employeeId)) {
      case (null) { Runtime.trap("PTO balance not found") };
      case (?balance) { balance };
    };
  };

  // ===== PTO Policy Management =====
  // Supervisors cannot add or update PTO policies (write operations restricted to HR Admin/Manager).

  public shared ({ caller }) func addPTOPolicy(policy : PTOPolicy) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can add PTO policies");
    };
    ptoPolicies.add(policy.id, policy);
  };

  public shared ({ caller }) func updatePTOPolicy(policy : PTOPolicy) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can update PTO policies");
    };
    ptoPolicies.add(policy.id, policy);
  };

  public query ({ caller }) func getPTOPolicy(policyId : Text) : async PTOPolicy {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view PTO policies");
    };
    switch (ptoPolicies.get(policyId)) {
      case (null) { Runtime.trap("PTO policy not found") };
      case (?policy) { policy };
    };
  };

  public query ({ caller }) func getAllPTOPolicies() : async [PTOPolicy] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view PTO policies");
    };
    ptoPolicies.values().toArray();
  };

  // ===== Org Chart / Role Queries =====
  // Supervisors can view employees by role (read-only).

  public query ({ caller }) func getEmployeesByRole(role : Role) : async [Employee] {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can query employees by role");
    };
    employees.values().toArray().filter(func(emp : Employee) : Bool { emp.role == role });
  };
};
