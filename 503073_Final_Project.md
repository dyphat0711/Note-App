# 503073 – WEB PROGRAMMING & APPLICATIONS
## FINAL PROJECT – SEMESTER II/2024-2025

*Last updated on 02/01/2025*

---

> **Mandatory Compliance with Red-Highlighted Content**
>
> For content highlighted in red, students must adhere strictly to the descriptions provided. Any deviation, modification, or addition of features will result in the submission being disqualified from evaluation.

---

## I. Overview

Develop a note management application that enables users to create and organize their notes. The notes can encompass diverse content formats, including text, images, and attached files. Students must strictly adhere to the functionalities outlined in this assignment. Introducing unrelated features that deviate from the specified requirements may indicate that the student did not independently complete the project. While students are permitted to utilize libraries and frameworks to aid in development—such as Bootstrap or React for the front end and Laravel for the back end — **no additional features beyond those described should be implemented.**

---

## II. Detailed Description

### 2.1 Account Management

- To access the service, users must possess an account and log in. If a user attempts to access the website without logging in, they will be immediately redirected to the login interface. Upon successful login, users will be directed to their personalized homepage, where they can view their notes.
- When registering for a new account, users are required to provide only the following information: email address, display name, and password (entered twice for confirmation). The website will not store passwords directly but will instead retain their bcrypt-hashed equivalents. Upon successful registration, users will be automatically logged in without requiring them to log in again. Additionally, an email containing an activation link will be sent to the user's registered email address.
- Before the account is activated, users will have access to all functionalities, with the only distinction being a prominent notification on the website indicating that the account is unverified and advising them to check their email to complete the activation process. Once the user clicks the activation link in the email, the account will be activated, and the notification will disappear.
- The **User Preferences** screen allows users to adjust specific settings, such as the font size of their notes, note colors, or toggling between light and dark themes.
- The **Password Reset** feature enables users to recover their password via email. Users must either click on the link provided in the email or input an OTP sent to their email before being redirected to the new password entry screen. Following a password reset, users are required to log in manually.

### 2.2 Simple Note Management

- By default, notes are displayed in a **grid view** layout. However, users have the flexibility to switch to a **list view** format if they prefer. This ensures that the interface caters to different user preferences and enhances accessibility.
- When creating a new note, users are required to input only the **title** and **content** fields; no additional fields or attributes are permitted. The same interface must be used for both adding and editing notes, meaning it is not allowed to develop separate screens for these two functionalities. Additionally, note content must be **saved automatically**, eliminating the need for users to click a "save" button. This auto-save feature ensures a seamless user experience and reduces the risk of data loss.
- For deleting notes, a **confirmation dialog** must always be displayed to obtain explicit consent from the user before proceeding with the deletion. This adds a layer of safety and prevents accidental loss of data. Notes can also support image attachments, with the option to include one or multiple images. Students have the discretion to implement the attachment feature in any way that fits the system's design and usability requirements.
- Notes should be sorted by default based on either their creation time or last modified time, with the most recent notes appearing at the top of the list. However, users can **"pin"** specific notes to the top, ensuring these are always displayed first. If multiple notes are pinned, they should be arranged according to the time they were pinned, maintaining a clear hierarchy.
- The platform must incorporate an efficient **search functionality**, enabling users to search for notes by keywords. The search should scan both the title and content of notes for matches. Instead of providing a "Search" button, the system should feature a **live search** mechanism, which triggers as soon as users start typing into the search box. A slight delay (e.g., 300ms) can be implemented to improve performance and responsiveness.
- **Label management** is another essential feature. Users should be able to view a list of all labels, add new labels, rename existing ones, and delete labels as needed. A note can either be label-free or associated with one or multiple labels. Furthermore, users must have the ability to filter notes by labels, displaying only those associated with the selected labels. It is important to note that if a label is deleted, it should not affect the notes it was linked to. Similarly, if a label is renamed, all notes associated with it must reflect the updated label name automatically, ensuring consistency across the system.

### 2.3 Advanced Note Management

- To enhance security, the website should offer a mechanism to **lock notes with a password**. For a standard note, when this feature is activated, users must set a password specific to that note. Each note has its own unique password, unrelated to others. Once password protection is enabled, a dialog will prompt users to enter the password before allowing any action, such as viewing, editing, or deleting the note. Users also have the option to change a note's password or disable password protection entirely if they no longer wish to use this feature.
- The ability to **share notes** is an advanced feature, allowing users to share their notes with others through their registered email accounts. When sharing, the note owner can specify sharing permissions such as read-only access or edit rights. They can also select one or multiple recipients. Furthermore, the owner retains full control to revoke access or modify sharing settings at any time.
- Recipients of shared notes should have a dedicated section where all notes shared with them are displayed. This section must clearly indicate the sharing status of each note, specifying whether it is read-only or editable. Additionally, it should provide information about who shared the note, along with the timestamp of when the sharing occurred. For notes shared with edit permissions, **real-time collaboration** should be implemented using **WebSocket** technology. This will enable multiple users to edit the note simultaneously while observing each other's changes in real time.
- For special notes, such as those that are shared, pinned, or password-protected, the system must include a **recognizable icon** for easy identification. This icon should be displayed in both list view and grid view layouts, allowing users to quickly identify the note's status without needing to open it or navigate to its details.

### 2.4 Additional Requirements

#### UI and UX Considerations

User Interface (UI) and User Experience (UX) are critical factors in creating an engaging website. The UI focuses on aesthetic elements, such as whether the design is visually appealing, while UX pertains to how users feel while interacting with the site—whether it is convenient or frustrating, fast or slow. Websites with average UI and UX will not be awarded points in this category. To receive 0.25 points, the website must demonstrate good UI and UX, while exceptional performance in these aspects will earn 0.5 points.

#### Responsive Design

Responsive design is a separate evaluation criterion due to its importance in both UI and UX. A responsive website must adapt seamlessly to different screen sizes, optimizing the use of available space across devices. At a minimum, the website must function well on three types of devices: smartphones, tablets, and desktop monitors.

#### Offline Capabilities

Offline capabilities, a hallmark feature of Progressive Web Apps (PWAs), should be implemented using JavaScript. This feature allows the website to remain accessible and display note content even when the user is offline or temporarily loses their internet connection. To implement this effectively, developers need to explore PWA principles and integrate a local database (using JavaScript) with the online database (e.g., MySQL). This combination ensures a seamless user experience by enabling users to view notes offline and synchronizing the data when an internet connection is restored.

#### Online Deployment

Online deployment involves hosting the website and all related services, such as databases, on a public platform, making it accessible to anyone via a domain name. To earn 0.5 points for this requirement, you must deploy your website and database on an online service, ensuring the system runs without errors and remains operational during the instructor's grading period.

If online deployment is not feasible, an alternative is to use **docker-compose**. In this case, you must follow the instructor's guidelines and provided project template to develop your application.

### 2.5 Notes

The descriptions provided above are not exhaustive or definitive. Students must rely on their experience and conduct additional research on similar services to ensure optimal implementation. A feature is considered fully completed only if it functions as described, includes error handling, avoids critical security vulnerabilities, and adheres to industry best practices. Below are examples illustrating approaches that distinguish between subpar and better implementations:

#### Sharing Notes

| Approach | Description |
|----------|-------------|
| **Subpar** | Allowing users to share notes simply by entering an email address. If the email exists in the system, the recipient sees the shared note when they log in. |
| **Better** | Implementing a mechanism to validate the entered email, ensuring it belongs to a registered user. The recipient should receive an email notification about the shared note. At a minimum, a notification should be prominently displayed in the recipient's account upon their next login. |

#### Password-Protected Notes

| Approach | Description |
|----------|-------------|
| **Subpar** | Creating a password by allowing users to enter the desired password once. When changing the password, the user enters the new password directly. Disabling protection requires only selecting an option from the menu. |
| **Better** | Requiring users to enter the password twice when creating or updating it. When changing the password, the user must first provide the current password and then input the new password twice. Disabling password protection should require re-entering the current password as final confirmation. |

#### Shared Notes Details

| Approach | Description |
|----------|-------------|
| **Subpar** | Simply allowing recipients to view the content without additional details. The note owner has no visibility into who the note has been shared with. |
| **Better** | Providing a detailed overview for the note owner. When the owner clicks on any shared note, they should see its sharing status and a list of all recipients, including each recipient's email address and permissions (read-only or editable). The owner should be able to modify or revoke sharing permissions from this interface. |

---

## III. Coding Guidelines

- Always use **relative URLs** instead of hardcoding fixed ports and hostnames. For example, replace `<img src="http://localhost:8080/images/phone.jpg">` with `<img src="images/phone.jpg">`.
- Avoid placing your web project in subdirectories. Ensure it is accessible directly at `http://localhost:8080/` rather than `http://localhost:8080/final_project`.
- You are permitted to use any libraries or frameworks, such as React for the frontend or Laravel for the backend, provided you either deploy the project online or set it up using Docker Compose.
- If neither option is feasible, include clear and detailed instructions in a `readme.txt` file to guide the instructor on running the project locally.

---

## IV. Rubric

### Account Management — 2.0 pts

| # | Criteria | Full Points | Level 1 (0 pt) | Level 2 (25–75%) | Level 3 (Full) |
|---|----------|:-----------:|----------------|------------------|----------------|
| 1 | User registration | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 2 | Account activation | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 3 | User login and logout | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 4 | Password reset | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 5 | View profile and avatar | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 6 | Edit profile and avatar | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 7 | Change password | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 8 | User preferences | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |

### Simple Note Management — 4.0 pts

| # | Criteria | Full Points | Level 1 (0 pt) | Level 2 (25–75%) | Level 3 (Full) |
|---|----------|:-----------:|----------------|------------------|----------------|
| 9 | Display notes in list view | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 10 | Display notes in grid view | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 11 | Create notes | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 12 | Update notes | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 13 | Delete notes | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 14 | Auto-save notes | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 15 | Attach images to notes | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 16 | Pin notes to top | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 17 | Search notes | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 18 | Label management (listing, add, edit, delete) | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 19 | Attach labels to notes | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 20 | Filter notes based on labels | 0.25 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |

### Advanced Note Management — 2.0 pts

| # | Criteria | Full Points | Level 1 (0 pt) | Level 2 (25–75%) | Level 3 (Full) |
|---|----------|:-----------:|----------------|------------------|----------------|
| 21 | Enable and disable password on notes | 0.5 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 22 | Password protection, change password on notes | 0.5 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 23 | Share and receive notes | 0.5 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |
| 24 | Collaboration and real-time modification | 0.5 | Not available or completely wrong | Implemented but not working properly or has serious bugs | Correctly implemented, no bugs or only insignificant bugs |

### Other Requirements — 2.0 pts

| # | Criteria | Full Points | Level 1 (0 pt) | Level 2 (25–75%) | Level 3 (Full) |
|---|----------|:-----------:|----------------|------------------|----------------|
| 25 | UI and UX | 0.5 | Poor design, inconsistent UI, no feedback, no accessibility | Basic styling, inconsistent UX, limited feedback, partial accessibility | Polished UI, intuitive UX, comprehensive feedback, fully accessible |
| 26 | Responsive Design | 0.5 | No adaptation to screen sizes, misaligned elements, no media queries | Partially responsive, limited media queries, layout issues on some devices | Fully responsive, optimized layouts, proper scaling, smooth transitions |
| 27 | Offline Capabilities | 0.5 | No offline functionality, no caching, no service worker | Limited offline access, partial caching, unreliable service workers | Robust offline access, effective caching, proper offline data synchronization |
| 28 | Online Deployment | 0.5 | Not deployed, no hosting or deployment plan | Online but unstable, poor performance, lacks HTTPS | Fully deployed, secure (HTTPS), optimized for performance, scalable, high uptime |

---

## V. Output Requirements

### Required Submission Components

1. **`Rubrik.docx`** — Self-assessment file listing all 28 features. Include the public URL to the web application and any required username/password for login. (Provided by the instructor at submission time.)

2. **`source/` folder** — Contains all source code:
   - *Without Docker Compose:* Include the entire source code (frontend, backend) and relevant database files. The project must be "cleaned" to remove unnecessary content before submission.
   - *With Docker Compose:* Include all source code, the `docker-compose` file, and instructions for running the application (e.g., where to run `npm install` and `docker-compose up`). Ensure thorough testing before submission.

3. **`demo.mp4`** — Demo video requirements:
   - Must include participation of **all team members** introducing the product.
   - Provide a brief overview of the technologies and architecture.
   - Sequentially demonstrate **each of the 28 features** (undemonstrated features are considered not implemented).
   - Minimum resolution: **1080p**, with clear audio.
   - If the file is too large, upload to YouTube and include the link.

4. **`readme.txt`** — Include:
   - Project building and running instructions
   - URL + server login information (if applicable)
   - Usernames/passwords for pre-loaded test accounts
   - Any relevant notes on building, running, and using the application
   - Clear statement of any optional/extra-credit features implemented

### Submission Format

Organize all contents into a folder named:
```
id1_fullname1_id2_fullname2
```
Compress as a ZIP file with the same name:
```
id1_fullname1_id2_fullname2.zip
```
Submit via the online learning system only. **Submissions via email are not accepted.**

### Important Policies

- **Missing components:** Failure to submit source code, video, or `Rubrik.docx` results in a score of **0** for the entire team.
- **Unrelated project:** Submitting an unrelated project results in a score of **0**.
- **Academic integrity:** Groups are prohibited from sharing code with each other or obtaining source code from the internet. Groups with similar source code (verified by specialized software) will receive a **0** for all members.
- **Essay vs. Final Project:** These are independent assessments. All team members must participate in both.

### Deductions

| Situation | Deduction |
|-----------|-----------|
| Late submission (per day, 1 second late = 1 day late) | −1.0 pt/day |
| Complex project configuration without clear run instructions | −2.0 pts |
| Project not cleaned before submission | −0.5 pts |
| Missing grading info (usernames/passwords, incorrect naming, missing content) | −1.0 pt |

---

*For questions or concerns, contact the instructor directly or via email at **maivanmanh@tdtu.edu.vn**.*
