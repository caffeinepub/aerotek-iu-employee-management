import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";



actor {
  include MixinStorage();

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
    linkedEmployeeId : ?Text;
  };

  public type AccountInfo = {
    username : Text;
    displayName : Text;
    role : Role;
    linkedEmployeeId : ?Text;
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
    linkedAccountUsername : ?Text;
    profileImageUrl : ?Text;
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

  public type CreateEmployeeWithAccountInput = {
    profile : Employee;
    username : Text;
    passwordHash : Text;
    displayName : Text;
    directManagerId : ?Text;
  };

  public type LinkEmployeeToAccountInput = {
    employeeId : Text;
    accountUsername : Text;
  };

  public type LinkEmployeeAccountResult = {
    #ok;
    #err : Text;
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
    buildingNumber : ?Text;
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

  public type NotificationType = {
    #schedulePublished;
    #scheduleUnpublished;
    #timeOffSubmitted;
    #timeOffApproved;
    #timeOffDenied;
    #urgentAlert;
  };

  public type Notification = {
    id : Text;
    recipientUsername : Text;
    message : Text;
    notificationType : NotificationType;
    isRead : Bool;
    createdAt : Int;
    relatedEntityId : ?Text;
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
  let notifications = Map.empty<Text, Notification>();

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
        linkedEmployeeId = null;
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
        linkedEmployeeId = null;
      },
    );
  };

  ensureHardcodedAdmins();

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

  func isAuthenticated(caller : Principal) : Bool {
    if (AccessControl.hasPermission(accessControlState, caller, #user)) {
      return true;
    };
    switch (principalToUsername.get(caller)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  func isShiftVisibleToCaller(shift : Shift, caller : Principal) : Bool {
    switch (shift.status) {
      case (#published) { true };
      case (#draft) { isHRAdminOrManager(caller) };
    };
  };

  // Helper: generate a unique notification ID
  func makeNotificationId(prefix : Text) : Text {
    prefix # "_" # debug_show (notifications.size());
  };

  // Helper: create and store a notification
  func createNotification(
    recipientUsername : Text,
    message : Text,
    notificationType : NotificationType,
    relatedEntityId : ?Text,
  ) {
    let id = makeNotificationId(recipientUsername);
    let notification : Notification = {
      id;
      recipientUsername;
      message;
      notificationType;
      isRead = false;
      createdAt = 0;
      relatedEntityId;
    };
    notifications.add(id, notification);
  };

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

  public shared ({ caller }) func login(username : Text, passwordHash : Text) : async ?UserProfile {
    switch (users.get(username)) {
      case (null) { null };
      case (?user) {
        if (user.passwordHash == passwordHash and user.username == username and user.active) {
          principalToUsername.add(caller, username);
          let profile : UserProfile = {
            username = user.username;
            role = user.role;
            employeeId = user.linkedEmployeeId;
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

  // Only HR Admins may call this endpoint.
  public shared ({ caller }) func linkEmployeeToAccount(input : LinkEmployeeToAccountInput) : async LinkEmployeeAccountResult {
    if (not isHRAdmin(caller)) {
      return #err("Unauthorized: Only HR Admins can link employees to accounts");
    };

    switch (employees.get(input.employeeId)) {
      case (null) { return #err("Employee not found: " # input.employeeId) };
      case (?emp) {
        switch (users.get(input.accountUsername)) {
          case (null) { return #err("Account not found: " # input.accountUsername) };
          case (?user) {
            switch (user.linkedEmployeeId) {
              case (null) {
                let updatedUser = {
                  user with
                  linkedEmployeeId = ?input.employeeId;
                };
                users.add(input.accountUsername, updatedUser);

                let updatedEmployee = {
                  emp with
                  linkedAccountUsername = ?input.accountUsername;
                };
                employees.add(input.employeeId, updatedEmployee);

                employeeIdToUsername.add(input.employeeId, input.accountUsername);

                #ok;
              };
              case (?existingEmployeeId) {
                return #err("Account already linked to employee: " # existingEmployeeId);
              };
            };
          };
        };
      };
    };
  };

  // Only HR Admins may call this endpoint.
  // Returns account info (username, displayName, role) without exposing passwordHash.
  public query ({ caller }) func getUnlinkedAccounts() : async ServiceResult<[AccountInfo]> {
    if (not isHRAdmin(caller)) {
      return #err("Unauthorized: Only HR Admins can get unlinked accounts");
    };

    let unlinkedAccounts = users.toArray().map(
      func((_, user) : (Text, User)) : AccountInfo {
        {
          username = user.username;
          displayName = user.displayName;
          role = user.role;
          linkedEmployeeId = user.linkedEmployeeId;
        };
      }
    ).filter(
      func(info : AccountInfo) : Bool { info.linkedEmployeeId == null }
    );

    #ok(unlinkedAccounts);
  };

  public shared ({ caller }) func createAccount(displayName : Text, username : Text, passwordHash : Text, role : Role) : async () {
    if (isHRAdmin(caller)) {
      // HR Admin can assign any role
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
        linkedEmployeeId = null;
      },
    );
  };

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

  public shared ({ caller }) func updateEmployeeProfile(employeeId : Text, email : Text, phone : Text, profileImageUrl : ?Text) : async ServiceResult<()> {
    // Check if the caller has permission. Only admins, hrAdmin, manager or the employee him/herself can update a profile
    if (not isHRAdminOrManager(caller)) {
      // Not a manager, now check if caller is linked to the employee.
      let ?profile = userProfiles.get(caller) else {
        return #err("Your session could not be found. Please try again in a few minutes or log out and in again.");
      };
      let ?callerEmployeeId = profile.employeeId else {
        return #err("There is no employee linked to your account. Please contact an administrator if you have questions.");
      };
      if (callerEmployeeId != employeeId) {
        return #err("You are not authorized to update this profile.");
      };
    };

    switch (employees.get(employeeId)) {
      case (null) { #err("Employee does not exist: " # employeeId) };
      case (?employee) {
        let updatedEmployee = {
          employee with
          email;
          phone;
          profileImageUrl;
        };
        employees.add(employeeId, updatedEmployee);
        #ok(());
      };
    };
  };

  // ===== Timesheets Management =====

  public shared ({ caller }) func submitTimesheet(timesheet : Timesheet) : async ServiceResult<Timesheet> {
    if (not isAuthenticated(caller)) {
      return #err("Unauthorized: Only authenticated users can submit timesheets");
    };

    // Non-admin/manager callers may only submit timesheets for themselves
    if (not isHRAdminOrManager(caller)) {
      switch (userProfiles.get(caller)) {
        case (null) {
          return #err("Unauthorized: No profile found for caller");
        };
        case (?profile) {
          if (profile.username != timesheet.employeeUsername) {
            return #err("Unauthorized: Can only submit timesheets for yourself");
          };
        };
      };
    };

    timesheets.add(timesheet.id, { timesheet with status = #submitted });
    #ok({ timesheet with status = #submitted });
  };

  public query ({ caller }) func getTimesheets() : async [Timesheet] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view timesheets");
    };

    switch (getCallerRole(caller)) {
      case (?role) {
        switch (role) {
          case (#hrAdmin) {
            timesheets.values().toArray();
          };
          case (#manager) {
            timesheets.values().toArray();
          };
          case (#employee) {
            let timesheetsArray = timesheets.values().toArray();
            timesheetsArray.filter(
              func(ts : Timesheet) : Bool {
                switch (userProfiles.get(caller)) {
                  case (?profile) {
                    profile.username == ts.employeeUsername;
                  };
                  case (null) { false };
                };
              }
            );
          };
          case (_) {
            timesheets.values().toArray();
          };
        };
      };
      case (null) {
        timesheets.values().toArray();
      };
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

  public shared ({ caller }) func createEmployee(profile : Employee) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can create employees");
    };
    employees.add(profile.id, profile);
  };

  public shared ({ caller }) func createEmployeeWithAccount(input : CreateEmployeeWithAccountInput) : async () {
    if (isHRAdmin(caller)) {
      // HR Admin can assign any role
    } else if (isHRAdminOrManager(caller)) {
      switch (input.profile.role) {
        case (#employee) { };
        case (#manager) { };
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

    if (users.containsKey(input.username)) {
      Runtime.trap("Username already exists: " # input.username);
    };

    if (employees.containsKey(input.profile.id)) {
      Runtime.trap("Employee ID already exists: " # input.profile.id);
    };

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
        linkedEmployeeId = null;
      },
    );

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
          linkedAccountUsername = profile.linkedAccountUsername;
          profileImageUrl = profile.profileImageUrl;
        };
        employees.add(id, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func deleteEmployee(id : Text) : async ServiceResult<()> {
    if (not isHRAdminOrManager(caller)) {
      return #err("Unauthorized: Only HR Admins or Managers can delete employees");
    };
    switch (employees.get(id)) {
      case (null) { #err("Employee not found: " # id) };
      case (?_) {
        employees.remove(id);
        employeeIdToUsername.remove(id);
        #ok(());
      };
    };
  };

  public query ({ caller }) func getEmployeeByBadgeId(badgeId : Text) : async ServiceResult<Employee> {
    if (not isAuthenticated(caller)) {
      return #err("Unauthorized: Only authenticated users can view employee profiles");
    };
    switch (employees.values().find(func(e : Employee) : Bool { e.badgeId == badgeId })) {
      case (null) { #err("Employee not found for badge ID: " # badgeId) };
      case (?profile) { #ok(profile) };
    };
  };

  public shared ({ caller }) func loginWithBadgeId(badgeId : Text) : async ServiceResult<UserProfile> {
    switch (employees.values().find(func(e : Employee) : Bool { e.badgeId == badgeId })) {
      case (null) {
        #err("No employee found with badge ID: " # badgeId);
      };
      case (?emp) {
        switch (employeeIdToUsername.get(emp.id)) {
          case (null) {
            #err("No linked user account found for employee: " # emp.id);
          };
          case (?username) {
            switch (users.get(username)) {
              case (null) {
                #err("User account not found for username: " # username);
              };
              case (?user) {
                if (not user.active) {
                  return #err("User account is inactive");
                };
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

  public shared ({ caller }) func assignShift(shift : Shift) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can assign shifts");
    };
    shifts.add(shift.id, shift);
  };

  public shared ({ caller }) func deleteShift(id : Text) : async () {
    if (not isHRAdminOrManager(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins or Managers can delete shifts");
    };
    shifts.remove(id);
  };

  // Helper: format a nanosecond timestamp as a simple date string YYYY-MM-DD
  // We use a simple approximation: days since epoch
  func formatDateFromNs(ns : Int) : Text {
    // Convert nanoseconds to days since Unix epoch
    let secondsPerDay = 86400;
    let totalSeconds = ns / 1_000_000_000;
    let daysSinceEpoch = totalSeconds / secondsPerDay;

    // Use a simple algorithm to compute year/month/day from days since epoch
    // Based on the civil date algorithm
    let z = daysSinceEpoch + 719468;
    let era = (if (z >= 0) { z } else { z - 146096 }) / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if (mp < 10) { mp + 3 } else { mp - 9 };
    let yr = if (m <= 2) { y + 1 } else { y };

    let pad2 = func(n : Int) : Text {
      if (n < 10) { "0" # debug_show n } else { debug_show n };
    };

    debug_show yr # "-" # pad2(m) # "-" # pad2(d);
  };

  public shared ({ caller }) func publishSchedule(department : Text, weekStart : Int) : async ServiceResult<Nat> {
    if (not isHRAdminOrManager(caller)) {
      return #err("Unauthorized: Only HR Admins or Managers can publish schedules");
    };
    let weekEnd = weekStart + 7 * 24 * 60 * 60 * 1_000_000_000;
    var count = 0;

    // Collect unique employee IDs whose shifts are being published
    let affectedEmployeeIds = Map.empty<Text, Bool>();

    for ((id, shift) in shifts.entries()) {
      if (
        shift.department == department and
        shift.date >= weekStart and
        shift.date < weekEnd and
        shift.status == #draft
      ) {
        shifts.add(id, { shift with status = #published });
        count += 1;
        affectedEmployeeIds.add(shift.employeeId, true);
      };
    };

    // Build notification message
    let weekStartDate = formatDateFromNs(weekStart);
    let message = "Schedule for " # department # " week of " # weekStartDate # " has been published";

    // Notify each affected employee and supervisor
    for ((empId, _) in affectedEmployeeIds.entries()) {
      switch (employeeIdToUsername.get(empId)) {
        case (null) { /* no linked account, skip */ };
        case (?username) {
          switch (users.get(username)) {
            case (null) { /* user not found, skip */ };
            case (?user) {
              if (user.active) {
                createNotification(username, message, #schedulePublished, ?department);
              };
            };
          };
        };
      };
    };

    #ok(count);
  };

  public shared ({ caller }) func unpublishSchedule(department : Text, weekStart : Int) : async ServiceResult<Nat> {
    if (not isHRAdminOrManager(caller)) {
      return #err("Unauthorized: Only HR Admins or Managers can unpublish schedules");
    };
    let weekEnd = weekStart + 7 * 24 * 60 * 60 * 1_000_000_000;
    var count = 0;

    // Collect unique employee IDs whose shifts are being unpublished
    let affectedEmployeeIds = Map.empty<Text, Bool>();

    for ((id, shift) in shifts.entries()) {
      if (
        shift.department == department and
        shift.date >= weekStart and
        shift.date < weekEnd and
        shift.status == #published
      ) {
        shifts.add(id, { shift with status = #draft });
        count += 1;
        affectedEmployeeIds.add(shift.employeeId, true);
      };
    };

    // Build notification message
    let weekStartDate = formatDateFromNs(weekStart);
    let message = "Schedule for " # department # " week of " # weekStartDate # " has been unpublished";

    // Notify each affected employee and supervisor
    for ((empId, _) in affectedEmployeeIds.entries()) {
      switch (employeeIdToUsername.get(empId)) {
        case (null) { /* no linked account, skip */ };
        case (?username) {
          switch (users.get(username)) {
            case (null) { /* user not found, skip */ };
            case (?user) {
              if (user.active) {
                createNotification(username, message, #scheduleUnpublished, ?department);
              };
            };
          };
        };
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

  public query ({ caller }) func getAllShiftsForEmployee(employeeId : Text) : async [Shift] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view shifts");
    };

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

    shifts.values().toArray().filter(
      func(shift : Shift) : Bool {
        shift.employeeId == employeeId and isShiftVisibleToCaller(shift, caller)
      }
    );
  };

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

  public query ({ caller }) func getShifts() : async [Shift] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view shifts");
    };

    switch (getCallerRole(caller)) {
      case (?#employee) {
        shifts.values().toArray().filter(
          func(shift : Shift) : Bool {
            shift.status == #published;
          }
        );
      };
      case (?#supervisor) {
        shifts.values().toArray().filter(
          func(shift : Shift) : Bool {
            shift.status == #published;
          }
        );
      };
      case (?#hrAdmin) {
        shifts.values().toArray();
      };
      case (?#manager) {
        shifts.values().toArray();
      };
      case (null) {
        Runtime.trap("Unauthorized: User role not found");
      };
    };
  };

  public shared ({ caller }) func submitTimeOffRequest(request : TimeOffRequest) : async () {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can submit time-off requests");
    };
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
      case (?emp) {
        timeOffRequests.add(request.id, request);

        // Notify all Manager and HR Admin accounts about the new time-off request
        let startDateStr = formatDateFromNs(request.startDate);
        let endDateStr = formatDateFromNs(request.endDate);
        let message = emp.fullName # " submitted a " # request.timeOffType # " time-off request from " # startDateStr # " to " # endDateStr;

        for ((_, user) in users.entries()) {
          if (user.active) {
            switch (user.role) {
              case (#hrAdmin) {
                createNotification(user.username, message, #timeOffSubmitted, ?request.id);
              };
              case (#manager) {
                createNotification(user.username, message, #timeOffSubmitted, ?request.id);
              };
              case (_) { /* skip employees and supervisors */ };
            };
          };
        };
      };
    };
  };

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

        // Notify the requesting employee
        switch (employeeIdToUsername.get(request.employeeId)) {
          case (null) { /* no linked account */ };
          case (?username) {
            switch (employees.get(request.employeeId)) {
              case (null) { /* employee not found */ };
              case (?emp) {
                let startDateStr = formatDateFromNs(request.startDate);
                let endDateStr = formatDateFromNs(request.endDate);
                let message = "Your " # request.timeOffType # " time-off request from " # startDateStr # " to " # endDateStr # " has been approved";
                createNotification(username, message, #timeOffApproved, ?requestId);
              };
            };
          };
        };
      };
    };
  };

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

        // Notify the requesting employee
        switch (employeeIdToUsername.get(request.employeeId)) {
          case (null) { /* no linked account */ };
          case (?username) {
            switch (employees.get(request.employeeId)) {
              case (null) { /* employee not found */ };
              case (?emp) {
                let startDateStr = formatDateFromNs(request.startDate);
                let endDateStr = formatDateFromNs(request.endDate);
                let message = "Your " # request.timeOffType # " time-off request from " # startDateStr # " to " # endDateStr # " has been approved";
                createNotification(username, message, #timeOffApproved, ?requestId);
              };
            };
          };
        };
      };
    };
  };

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

        // Notify the requesting employee
        switch (employeeIdToUsername.get(request.employeeId)) {
          case (null) { /* no linked account */ };
          case (?username) {
            switch (employees.get(request.employeeId)) {
              case (null) { /* employee not found */ };
              case (?emp) {
                let startDateStr = formatDateFromNs(request.startDate);
                let endDateStr = formatDateFromNs(request.endDate);
                let message = "Your " # request.timeOffType # " time-off request from " # startDateStr # " to " # endDateStr # " has been denied";
                createNotification(username, message, #timeOffDenied, ?requestId);
              };
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getAllTimeOffRequestsForEmployee(employeeId : Text) : async [TimeOffRequest] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view time-off requests");
    };
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

  public query ({ caller }) func getTimeOffRequests() : async [TimeOffRequest] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Unauthorized: Only authenticated users can view time-off requests");
    };

    switch (getCallerRole(caller)) {
      case (?role) {
        switch (role) {
          case (#hrAdmin) {
            timeOffRequests.values().toArray();
          };
          case (#manager) {
            timeOffRequests.values().toArray();
          };
          case (#employee) {
            let requests = timeOffRequests.values().toArray();
            requests.filter(
              func(req : TimeOffRequest) : Bool {
                switch (userProfiles.get(caller)) {
                  case (?profile) {
                    switch (profile.employeeId) {
                      case (?eid) { req.employeeId == eid };
                      case (null) { false };
                    };
                  };
                  case (null) { false };
                };
              }
            );
          };
          case (_) {
            timeOffRequests.values().toArray();
          };
        };
      };
      case (null) {
        timeOffRequests.values().toArray();
      };
    };
  };

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

  public query ({ caller }) func getEmployeesByRole(role : Role) : async [Employee] {
    if (not isHRAdminOrManagerOrSupervisor(caller)) {
      Runtime.trap("Unauthorized: Only HR Admins, Managers or Supervisors can query employees by role");
    };
    employees.values().toArray().filter(func(emp : Employee) : Bool { emp.role == role });
  };

  // ===== Notification System =====

  // Returns all notifications for the calling user (filtered by recipientUsername from the session).
  // Requires authentication.
  public query ({ caller }) func getNotifications() : async ServiceResult<[Notification]> {
    if (not isAuthenticated(caller)) {
      return #err("Unauthorized: Only authenticated users can view notifications");
    };

    let ?username = principalToUsername.get(caller) else {
      return #err("Could not find username for caller");
    };

    let userNotifications = notifications.toArray().map(func((_, n) : (Text, Notification)) : Notification { n }).filter(
      func(n : Notification) : Bool { n.recipientUsername == username }
    );

    #ok(userNotifications);
  };

  // Marks a single notification as read by ID.
  // Only the recipient may mark their own notification as read.
  public shared ({ caller }) func markNotificationRead(notificationId : Text) : async ServiceResult<()> {
    if (not isAuthenticated(caller)) {
      return #err("Unauthorized: Only authenticated users can mark notifications read");
    };

    let ?username = principalToUsername.get(caller) else {
      return #err("Could not find username for caller");
    };

    switch (notifications.get(notificationId)) {
      case (null) {
        #err("Notification not found: " # notificationId);
      };
      case (?notification) {
        if (notification.recipientUsername != username) {
          return #err("Unauthorized: Cannot mark notifications for other users");
        };
        let updated = { notification with isRead = true };
        notifications.add(notificationId, updated);
        #ok(());
      };
    };
  };

  // Marks all of the calling user's notifications as read.
  // Requires authentication.
  public shared ({ caller }) func markAllNotificationsRead() : async ServiceResult<()> {
    if (not isAuthenticated(caller)) {
      return #err("Unauthorized: Only authenticated users can mark notifications read");
    };

    let ?username = principalToUsername.get(caller) else {
      return #err("Could not find username for caller");
    };

    notifications.entries().forEach(
      func((id, notification) : (Text, Notification)) {
        if (notification.recipientUsername == username and not notification.isRead) {
          let updated = { notification with isRead = true };
          notifications.add(id, updated);
        };
      }
    );

    #ok(());
  };

  // HR Admin only: sends an urgent alert to every active user account in the system.
  public shared ({ caller }) func sendUrgentAlert(message : Text) : async ServiceResult<()> {
    if (not isHRAdmin(caller)) {
      return #err("Unauthorized: Only HR Admins can send urgent alerts");
    };

    users.values().toArray().forEach(
      func(user : User) {
        if (user.active) {
          let notification : Notification = {
            id = user.username # "_urgentAlert_" # debug_show (notifications.size());
            recipientUsername = user.username;
            message;
            notificationType = #urgentAlert;
            isRead = false;
            createdAt = 0;
            relatedEntityId = null;
          };
          notifications.add(notification.id, notification);
        };
      }
    );
    #ok(());
  };
};
