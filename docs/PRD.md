# Scope

The proposed Facility Management & Services system is a comprehensive digital solution engineered to
optimize and streamline the core operational functions and processes within an organization. The system
provides a robust architecture for automating the Company, Buyer, and Supplier workflows, ensuring a seamless
flow of data from the initial request to final delivery. This digital transformation serves as a critical milestone
toward establishing a fully automated centralized portal that connects Company Administrators, Buyers, and
Suppliers in a unified ecosystem.
The rollout of this system is designed to encompass the entire workforce, effectively digitizing all personnel
management and inventory tracking processes. By transitioning to this automated model, the organization
eliminates the inefficiencies of manual handling, reduces the risk of human error, and ensures real-time visibility
into resource allocation. Ultimately, the system aims to create a paperless environment where administrative
tasks are handled with digital precision, allowing the company to focus on its core growth and strategic
objectives.

# Application Stakeholders

1. Admin
2. Company MD
3. Company HOD
4. Account
5. Dilver Boy
6. Buyer
7. Supplier/vendor
8. Security Gard
9. Security Supervisor
10. Society Manger
11. Service Boy

# Master Data

**Company Module**

**1. Role Master**
     Role Master defines user roles and access levels in the system. It controls what actions a user
       can perform**.
2. Designation Master**
     Designation Master is used to define official job titles/positions in an organization.
**3. Employee Master**
     While implicitly represented under Company Admin, this master manages the internal staff
       authorized to handle Request Received actions, Indent Generation, and Check Feedback.
**4. User Master**
     User Master is used to create and manage system users who are authorized to log in and
       operate the application. It ensures secure authentication, role-based access control, and
       accountability for all system activities.


**Supply Module Master**

**5. Product Category:**
     Product Category Master is used to define and manage high-level classification of products. It
       helps in organizing products for standardization, reporting, and management.
**6. Product Subcategory:**
     Product Subcategory Master is used to define sub-level classification of products under a
       product category, enabling more granular organization.
**7. Product Master:**
     The system shall allow the definition of finished products with attributes: Name, Product Code,
       Rate, and Unit of Measurement.
**8. Supplier Details**
     Stores basic profile information for each vendor (implied by the "Supplier Master" label).
**9. Suppliers Wise Product:**
     A mapping tool that defines which products from the Product Master are supplied by which
       specific vendor.
**10. Suppliers Wise Product Rate:**
     A pricing repository that tracks the pre-negotiated purchase costs for each product per supplier
**11. Sale Product Rate:**
     **Price Standardization:** It defines the fixed or base selling price for every item listed in the Product
       Master.
     **Revenue Control:** It acts as the counterpart to the Suppliers Wise Product Rate, allowing the
       Company Admin to manage the margin between procurement cost and sale price.
     **System Integration:** It is linked directly to the Product Category and Product Master to ensure that
       rates are applied to the correct stock items.

**Services Module Master**

**12. Daily Checklist Master**
    This master defines the routine inspection points for various departments (Security, Housekeeping,
    Maintenance). It stores a list of "Yes/No" or "Value-based" questions that a staff member must
    answer every day, such as "Is the water motor pump working?" or "Are all fire exits clear?"
**13. Vendor Wise Services Master**
    This creates a direct link between a Vendor and the specific categories they are authorized to
    handle. It ensures that when you raise a request for "AC Repair," the system only lists vendors who
    are tagged for "Technical Services" and not those tagged for "Plantation."
**14. Work Master**
    The Work Master is a library of all possible tasks or "Job Types" that can be performed in the society.
    It defines individual activities like "Filter Cleaning," "Gas Top-up," "Lawn Mowing," or "Chemical
    Spraying" so they can be tracked as separate line items.
**15. Services Wise Work Master**
    This maps specific Work items to a broader Service category for easier assignment.
    Example: Under the "Pest Control Service," it maps the works "Fogging," "Gel Application,"


**HRMS Module Master**

**16. Leave Type Master**
    Defines the categories of time-off available to staff, such as Sick Leave, Casual Leave, or Paid Leave,
    along with their yearly quotas and carry-forward rules.
**17. Holiday Master**
    A pre-defined list of National and Regional holidays for the calendar year that helps the system
    calculate payroll, public holiday pay, or overtime for staff on duty.
**18. Company Event**
    A scheduling tool used to organize and notify staff about society meetings, training sessions, or
    emergency drills, including the specific date, time, and venue.
**19. Company Location Master**
    Registers all physical sites or specific points within the society—such as Gate 1, the Clubhouse, or
    Basement Parking—to enable accurate GPS tracking and Geo-Fencing for staff.

# Services

1. Facility Management & Services.
2. Air conditioner Services.
3. Plantation Services.
4. Printing & Advertising Services
5. Pest Control Services.

##  Facility Management & Services.

**1. Security Services**
You utilize a **Grade-Based Logic** to match the right skill level with the client’s budget and risk profile:
 **Grades A, B, C, D**
    Guards are categorized based on their physical fitness, educational background, communication skills,
    and salary expectations.
     Grade A/B: High-end corporate or luxury residential (Premium skills).
     Grade C/D: Industrial or general perimeter security (Basic skills).
**2. Specialized Personnel**
     Gunman: Licensed armed personnel for high-risk assets (Banks, Cash-in-transit).
     Door Keeper: Focused on hospitality, access control, and visitor management.
**3. Staffing & Soft Services**
    Beyond security, you manage the complete ecosystem of a facility:
        Housekeeping: Professional cleaning and maintenance staff.
        Pantry: Trained personnel for office cafeterias and executive dining.
        Office Boy/Girls: Support staff for administrative assistance and internal logistics


# Security Guard Monitoring System

```
I. Instant Panic Response
 Purpose: Immediate alert for high-risk situations (medical, fire, or theft).
 Functionality: A prominent Red Button on the Guard's app home screen.
 Action: When pressed, it sends an immediate notification to the Society Manager Dashboard
and an SMS/App alert to the Society Committee Members.
 GPS Tracking: It should capture the guard’s exact location at the time of the alert.
II. Daily Operational Checklist
 Purpose: To ensure routine maintenance tasks are performed.
o Parking Lights: Record time of turning ON (Evening) and OFF (Morning).
o Water Supply: Log motor pump status and tank water levels.
o Gate/Shutter Check: Verify that secondary gates or shutters are locked at night.
 Evidence: Option to take a photo as proof of task completion.
III. Alert System (Stationary Guard & Compliance)
 Static Alert: If the guard's GPS location does not change for a set period (e.g., 30 minutes), the
system triggers an "Inactivity Alert" to the Manager.
o Note: This prevents guards from sleeping or neglecting patrols.
 Checklist Reminder: If the Daily Checklist is not filled by a certain time (e.g., 9:00 AM), an
automatic reminder is sent to the guard.
VIII. Emergency Contact Directory
 Quick Dial: A list within the app for the guard to call with one tap:
o Police: Local station direct line.
o Fire Brigade: Nearest fire station.
o Ambulance: Local hospitals or society-tied medical services.
o Electrician/Plumber: For society-wide emergencies.
```
# Ticket Generation System (Employee Behaviour)

```
I. Ticket Creation (By Society Manager)
 The Manager opens the dashboard to report an incident regarding a specific employee.
 Employee Name/ID: Dropdown list of all registered staff.
II. Category of Behaviour:
 Sleeping on Duty: Found asleep during night shift.
 Rudeness: Miss behaviour with a resident or visitor.
 Absence from Post: Guard missing from the gate for a long time (linked to the Alert System).
 Grooming/Uniform: Not wearing the proper uniform or badge.
 Unauthorized Entry: Allowing visitors without following the Visitor Enter protocol.
```

```
III. Evidence & Documentation
 Incident Description: A detailed note on what exactly happened.
 Media Upload: Option to attach a photo (e.g., photo of the guard sleeping)
 Date & Time: Automatically captured when the ticket is raised.
IV. Severity Levels
 The Manager assigns a priority to the ticket:
 Low (Warning): First-time minor mistake (e.g., uniform issue).
 Medium (Serious): Repeated mistakes or minor arguments.
 High (Critical): Physical fight, theft, or leaving the gate unattended during peak hours.
```
# Visitor Management System

```
I. Add Visitor Information
 Guest Entry: Capture Name, Photo, Phone Number, and Vehicle Number.
 Daily Visitor (Frequent): A separate database for staff like Maids, Drivers, Milkmen, and Car
Cleaners.
II. Society Family Database
 Data Structure: Flat Number, Owner/Tenant Name, Primary & Secondary Mobile Numbers.
 Member List: A searchable directory for the guard (without showing full personal details for
privacy) to verify which flat a visitor is going to.
III. Notification System (SMS/App)
 Automated SMS: "Dear Resident, [Visitor Name] is at the gate for [Flat No]."
 Push Notifications: If the resident has the app, a pop-up alert with the visitor's photo is sent
instantly.
IV. Society Manager Dashboard
 Analytics: A central web portal to see:
o Visitor Stats: Total entries per day/week.
o Checklist Status: Green/Red indicators for completed or pending tasks.
o Panic Logs: History of SOS alerts with resolution notes.
o Staff Attendance: Log-in/Log-out times for security personnel.
```

##  Air conditioner Services.

```
I. Technical Staff Management
This is a specialized sub-section of your HRMS Profile, specifically for AC Technicians.
 Skill Mapping: Categorize staff by expertise (e.g., Centralized Plant, Split AC, Window AC, Gas
Charging Specialist).
 Certifications: Store technical diplomas or safety training certificates.
 Attendance & Geo-Fencing: Since technicians move between wings or different society sites
II. Equipment Supply (Inventory)
 Stock Master: Track items like Refrigerant Gas (R32/R410), Capacitors, Copper Pipes, Filters, and
Remote Controls.
 Purchase Orders (PO): Raise requests to vendors when stock is low.
 Issue to Staff: Record which technician took which part (e.g., "Technician A took 1 Capacitor for
Wing B AC").
 Inventory Alerts: Notify the manager when essential spare parts are below the "Reorder Level."
III. Service & Maintenance (Workflow)
 Service Request: Resident or Manager logs a complaint (e.g., "AC not cooling").
 Work Progress: Step 1: Technician arrives and clicks "Start Work" (captured with GPS).
o Step 2: Uploads "Before" photo.
o Step 3: Replaces parts (linked to Equipment Supply).
o Step 4: Uploads "After" photo and clicks "Complete."
```
##  Pest Control Services

```
I. Staff Management
 Technician Certification: Store licenses for handling hazardous chemicals (mandatory in many
regions).
 Protective Gear (PPE) Checklist: Before starting a job, the staff must check off items in the app
(Masks, Gloves, Eye Protection, Aprons).
 Attendance with Photo & GPS: Ensuring the technician is physically present at the specific
treatment site (e.g., Basement B2 or Wing A Garden).
II. Pest Control Material
 Managing chemicals is different from regular inventory because they are hazardous and have
expiry dates.
```

```
III. Chemical Stock Master:
 Insecticides/Pesticides: (e.g., Deltamethrin, Imidacloprid).
 Rodenticides: (Rat bait stations, glue pads).
IV. Anti-Termite Solutions.
 Material Request & Approval: Technicians request a specific quantity; the Manager approves it.
The system subtracts this from the main store.
 Expiry Alerts: Automated notifications when a batch of chemicals is nearing its "Best Before"
date.
 Spill Kit Inventory: Tracking the availability of absorbent materials (clay, sawdust) and
neutralizers in the storage area.
V. Service & Maintenance (Workflow)
 Scheduled Services (General Pest Control - GPC)
 Recurring Calendar: Automated schedule for common areas (monthly for drains, quarterly for
building perimeter).
 Service Proof: Technicians must upload "Before" and "After" photos of the treated areas (e.g.,
spray being applied to drains).
VI. Complaint-Based Service (Specific Infestation)
 Ticket Generation: Resident raises a ticket for "Bed Bugs" or "Cockroaches."
 Treatment Plan: Technician selects the type of treatment (Fogging, Spraying, or Gel Application).
 Resident Instruction: System automatically sends an SMS/Notification to the family
"Pest control scheduled for today at 4 PM. Please keep kids/pets away and cover all food items."
```
##  Printing & Advertising Services

```
This module handles the internal and external communication needs of the society.
I. Internal Printing (Operations)
 Document Generation: Automatically printing/generating:
o Visitor Passes: For long-term visitors or contractors.
o ID Cards: For staff (linked to the Employee Profile).
o Notices: Standard templates for "Water Cut Alerts" or "Meeting Minutes."
II. Advertising Management
 Ad-Space Master: Managing physical locations for ads (e.g., Lift posters, Notice boards, Entry gate
banners).
```

# Human Resource Management System

```
I. Recruitment Process
This module tracks a candidate from "Applicant" to "Hired Staff."
 Job Requisition: Manager posts a requirement (e.g., "Need 2 Night Shift Guards").
 Application Entry: Capture basic details, source (Agency/Referral), and Interview status.
 Background Verification (BGV): A critical step for society security. Status tracking for Police
Verification and Address Verification.
 Onboarding: One-click conversion from "Candidate" to "Employee."
II. Employee Profile
The digital identity of the staff member.
 Personal Info: Full name, Blood Group, Date of Birth, Emergency Contact.
 Job Details: Employee ID, Designation, Date of Joining, Reporting Manager.
 Shift Assignment: Mapping the employee to specific timings (e.g., Morning Shift 8 AM - 8 PM).
III. Smart Attendance & Geo-Fencing
To eliminate "Proxy Attendance" and ensure the guard is actually at the gate.
 Selfie Attendance: Guard takes a photo via the app to clock in.
 Geo-Fencing: The "Check-in" button only works if the guard is within a 50-meter radius of the
Company Location Master (e.g., the Main Gate).
 Auto-Punch Out: If the guard leaves the Geo-fence area for too long, the system flags it.
IV. Employee Documents
 Identity Proofs: Aadhar Card, PAN Card, Voter ID.
 Security Licensing: PSARA training certificates (for guards).
 Police Verification Report: Mandatory PDF upload.
V. Employee Leave
Managed via the Leave Type Master you created earlier.
 Leave Application: Staff applies through their app.
 Approval Workflow: Manager receives a notification to Approve or Reject based on staff
availability.
 Leave Balance: Real-time view of remaining Sick/Casual leaves.
VI. Employee Payroll
 Earnings: Basic Salary + HRA + Special Allowance + Overtime (OT).
 Deductions: PF (Provident Fund), PT (Professional Tax), ESIC,
 Attendance Integration: Salary is automatically calculated based on "Present Days" from the
Smart Attendance module.
 Payslip Generation: Staff can download their monthly payslip directly from the app.
```

# Inventory

##  Buyer

```
 Service Request Generation: The Buyer logs into the portal and selects a Service Category (e.g., Security
Services).
 Grade & Role Selection: For Security , the Buyer chooses the specific "Type" (Grade A, B, C, or D).
o For Staffing , the Buyer selects the "Designation" (Pantry, Housekeeping, etc.).
 Requirement Specification: The Buyer defines the quantity (headcount), the shift timings, and the
duration of the deployment.
```
##  Company Admin

```
 Rate Verification: The Admin reviews the request. The system automatically pulls the Sale Service Rate
based on the Security Grade or Staffing Designation from the Master Data.
 Service Indent Generation: Once validated, the Admin converts the request into a Service Indent. This is
the internal document that formalizes the demand.
 Vendor Matching: Using the Suppliers Wise Service Master , the Admin identifies which vendor provides
the specific Grade or Role requested.
 Forwarding: The Admin executes a Service Indent Forward to the chosen Supplier.
```
##  Supplier

```
The Supplier (Third-party agency) manages their roster to fulfill the company’s requirements.
 Indent Review: The Supplier receives the notification. They check their personnel database to ensure
they have "Grade A" guards or "Pantry Staff" available for the requested dates.
 Commitment: Indent Accept: Supplier confirms they can provide the personnel.
o Indent Reject: Supplier cites lack of availability.
 Service Purchase Order (SPO): Upon acceptance, the Admin issues a formal Service Purchase Order ,
which serves as the legal contract for the deployment.
 System Status: Received SPO.
```
##  Deployment

```
 Dispatch Personnel: The Supplier updates the system to Personnel Dispatched. This notifies the Admin
and Buyer that the staff are en route or scheduled to arrive.
 Service Delivery Note: The Supplier uploads or issues a digital "Delivery Note" which includes the names
and credentials of the deployed staff.
 Service Acknowledgment: Upon arrival at the Buyer’s location, the Admin (or Site Supervisor) performs
a Service Acknowledgment.
o Verification: They confirm that the 5 guards arrived and that their skill levels match the "Grade B"
requirement requested.
 System Status: Deployment Confirmed.
```

## Financial Closure & Quality Audit

The final phase ensures fiscal accuracy and maintains high service standards.

```
 Service Bill Generation: The Supplier submits a Supplier Bill based on the Suppliers Wise Service Rate.
 Reconciliation: The Admin verifies the Bill against the Service Acknowledgment (checking for
headcount).
 Buyer Invoicing: The Admin generates a Sale Bill for the Buyer.
 Payment Processing: Buyer pays the Company (Status: Sale Bill Paid).
o Company pays the Supplier (Status: Supplier Bill Paid).
 Check Feedback (Crucial Step): The Buyer is prompted to rate the performance:
o Security: Was the "Gun Man" professional? Was the "Grade A" guard's conduct satisfactory?
o Staffing: Was the Housekeeping staff punctual?
 Process Boundary: END.
```
# Material Supply Services

 Security Panel & Door Controller Materials.
 Hot & Cold Beverages Materials.
 Eco-Friendly Disposable Solutions Materials.
 Cleaning Essential Materials.
 Pest Control Materials.
 Air Fresheners Materials.
 Stationery Materials
 Corporate Gifting Materials.

##  Company Workflow (Admin)

```
a. Request Management
This is the intake phase where the admin evaluates incoming demand:
 Request Intake: The process begins with Request Received, typically triggered by a Buyer's "Order
Request".
 Decisioning: The Admin has three primary actions for any request:
o Accept: Moves the request into the procurement phase.
o Pending: Places the request on hold for further review or stock availability.
o Reject Received: Formally denies the request, which may trigger a notification back to the
requester.
```

```
b. Indent Generation
Once a request is accepted, it is converted into a formal internal demand:
 Creation: The Admin performs Indent Generation to specify exactly what products are needed from
the Master Data.
 Forwarding: The Admin executes a Forward Indent (or Indent Forward) to the appropriate vendor
identified in the "Supplier Master".
c. Procurement
This phase handles the formal legal and logistical ordering through the following steps:
 Purchase Order (PO): Once an indent is generated and accepted, the Company Admin issues a
formal Company Purchase Order to the selected supplier.
 Order Tracking: The system monitors the lifecycle of the order. This includes tracking the Supplier
Order status and logging the Received Note provided by the supplier upon delivery.
 Material Acknowledgment: After the physical items are delivered, the admin performs a specific
Acknowledge Material Request. This step is crucial to confirm that the physical goods received
accurately match the initial internal demand and the quantities specified in the Master Data.
 Logistics Status: During this phase, the order status transitions through several key checkpoints,
including Received PO and Dispatch PO , ensuring transparency in the movement of goods.
```
##  Financial & Feedback

```
This final phase ensures fiscal closure and maintains quality standards through the following steps:
 Bill Processing: The Company Admin manages the Purchases Bill. This involves a reconciliation
process where the invoice is verified against the "Received Note" and the "Acknowledge Material
Request" to ensure the company only pays for what was actually delivered.
 Payment Tracking: Once the financial obligation to the supplier is settled, the Admin updates the
system status to Paid. This status is tracked for both the "Purchases Bill" (Company to Supplier) and
the "Sale Bill" (Buyer to Company) to ensure a balanced ledger.
 Check Feedback: Before the transaction reaches the absolute END state, the Admin performs a
Check Feedback. This step captures the quality of the service or product provided by the supplier
and the satisfaction level of the buyer, serving as a performance metric for future procurement
decisions
```
##  Buyer Workflow

```
The flow for the party requesting the materials includes the following phases:
 Order Initiation: The process begins when the Buyer submits an Order Request to the Company Admin.
This request triggers the "Request Received" status in the Admin's dashboard.
```

```
 Confirmation: Once the Admin processes the request, the Buyer receives an Order Received
notification. At this stage, the Buyer has the authority to:
o Accept: Move forward with the proposed solution or quotation.
o Reject: Terminate the request if the terms, items, or timelines are not suitable.
 Completion: This is the final fulfilment and closure stage:
o Purchases Bill: The Buyer receives the Purchases Bill (or Sale Bill from the Admin's perspective)
once the material is ready or delivered.
o Feedback: The Buyer is required to provide Feedback regarding the quality of the service or
items received.
o END: After feedback is submitted and the bill is settled ( Paid ), the transaction officially reaches
the END state.
```
##  Supplier Workflow

```
The interaction with vendors for fulfilment includes the following steps:
 Indent Response : The workflow begins with Indent Received (the request forwarded by the Company
Admin).
o The Supplier must evaluate their capacity and respond by marking the status as either Indent
Accept or Indent Reject.
 Logistics & Order Management: Once the Indent is accepted and a formal Company Purchase Order is
issued, the status moves to Received PO.
o The Supplier then prepares the goods and updates the system to Dispatch PO, signalling that the
materials are en route to the company.
 Billing & Payment: Upon or after delivery, the vendor generates a Supplier Bill within the system.
o The Supplier tracks this bill through the system's financial module until the Company Admin
updates the status to Paid, confirming the completion of the financial obligation.
```
##  Status Tracking & Control

```
The system governs the lifecycle of every request through four distinct categories of states:
 Start/End (Process Boundaries):
o Start: Initiated when a Buyer submits an "Order Request."
o END: Reached only after the Bill is marked as "Paid" and the "Check Feedback" process is
completed.
 Approval States (Decision Points):
o Accept / Reject: Used by the Admin to approve or deny the initial "Order Request" or "Received
Quotation."
o Pending: A holding state used when a request requires further review or stock is unavailable.
o Indent Accept / Indent Reject: Specifically used by the Supplier to confirm whether they can fulfill
the forwarded demand (Indent).
```

```
 Financial States (Fiscal Closure):
o Paid: This critical status is tracked for both sides of the ledger:
 Supplier Bill: Confirms the company has paid the vendor.
 Purchases/Sale Bill: Confirms the Buyer has paid the company.
 Logistics States (Movement Tracking):
o Indent Forward: Tracks the movement of the formal demand from Admin to Supplier.
o Received PO: Confirms the Supplier has officially received the Purchase Order and is beginning
fulfilment.
o Dispatch PO: Indicates that the goods have left the Supplier's location and are en route for
delivery.
```
# Ticket Generation System

```
 Check Bad Material (Quality Check)
 Purpose: To identify damaged, expired, or sub-standard items.
Fields in Ticket:
 Condition Status: (Good / Damaged / Expired / Leaking).
 Photo Evidence: Mandatory photo upload of the damaged item or the expiry date label.
 Batch Number: To track specific faulty lots from a vendor.
 Action: If marked "Bad," the system flags this item as "non-usable" and prevents it from
entering the Supply Inventory.
 Check Quantity Material (Quantity Check)
 Purpose: To verify if the physical count matches the Invoice/Purchase Order (PO).
 Fields in Ticket:
o Ordered Quantity: (e.g., 50 units).
o Received Quantity: (e.g., 45 units).
o Shortage: Automatically calculated (Ordered - Received).
 Action: The system generates a "Shortage Note" to the vendor and adjusts the inventory to
reflect only the 45 units actually received.
 II. Ticket Category: Material Return (RTV - Return to Vendor)
 If the material fails the checks above, a Return Ticket is generated to track the exit of goods.
 Return Material
 Purpose: To document why and when items were sent back.
 Fields in Ticket:
 Reason for Return: (Wrong Item Sent / Damaged / Quality Not as per Sample).
```

 **Digital Workflow (Step-by-Step)**

```
o Material Arrival: Security at the Visitor Enter gate logs the delivery vehicle.
o Manager Notification: The Manager receives an alert to inspect the goods.
o Ticket Generation: The Manager opens the "Material Ticket" form and fills in:
o Check Quantity: (Matches PO?)
o Check Quality: (Any "Bad Material"?)
o Submission: If Approved: Items are added to the Plantation/AC/Pest Control
Master Inventory.
o If Rejected: A Return Ticket is created.
o Closure: The ticket is closed once the vendor replaces the material or provides a credit note.
```

