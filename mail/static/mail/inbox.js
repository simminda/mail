document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archived")
    .addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  // By default, load the inbox
  load_mailbox("inbox");
});


function compose_email() {
  // Show compose view and hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";

  // Clear out composition fields
  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";

  // Attach an event listener to the form's submit button
  document.querySelector("#compose-form").onsubmit = function (event) {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Get values from the form fields
    const recipients = document.querySelector("#compose-recipients").value;
    const subject = document.querySelector("#compose-subject").value;
    const body = document.querySelector("#compose-body").value;

    // Make a POST request
    fetch("/emails", {
      method: "POST",
      body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body,
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        // Print result on the page
        const emailsView = document.querySelector("#emails-view");
        emailsView.style.display = "block";
        document.querySelector("#compose-view").style.display = "none";

        if (result.error) {
          emailsView.innerHTML = `<div class="alert alert-danger" role="alert">
            <strong>Error:</strong> ${result.error}
          </div>`;
        } else {
          emailsView.innerHTML = `<div class="alert alert-success" role="alert">
            <strong>Success:</strong> Your email was sent successfully.
          </div>`;

          // Load the sent mailbox after sending the email
          load_mailbox("sent");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        const emailsView = document.querySelector("#emails-view");
        emailsView.style.display = "block";
        emailsView.innerHTML = `<div class="alert alert-danger" role="alert">
          <strong>Error:</strong> An unexpected error occurred. Please try again later.
        </div>`;
      });
  };
}


function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";

  // Show the mailbox name
  document.querySelector("#emails-view").innerHTML = `
    <h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>
    <table class="table table-hover" id="mailbox-table">
      <tbody></tbody>
    </table>
  `;

  // Fetch mailbox data
  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => {
      // Display each email in the mailbox
      emails.forEach((email) => {
        // Create a table row for each email
        const emailRow = document.createElement("tr");

        // Determine if the email is read or unread
        const emailStatus = email.read ? "table-secondary" : "table-white"; // "table-secondary" for read, "table-white" for unread
        emailRow.className = emailStatus;

        // Determine the envelope icon based on the read status
        const envelopeIcon = email.read
          ? '<i class="bi bi-envelope-open"></i>'
          : '<i class="bi bi-envelope-fill"></i>';

        // Determine whether to show the sender or recipients
        let displayContact;
        if (mailbox === "inbox") {
          displayContact = `<strong>${email.sender}</strong>`;
        } else if (mailbox === "sent") {
          const recipients = email.recipients.join(", ");
          displayContact = `<strong>${recipients}</strong>`;
        } else {
          displayContact = `<strong>${email.sender}</strong>`; // Fallback for other mailboxes like "archive"
        }

        // Add email details to the row
        emailRow.innerHTML = `
          <td>${envelopeIcon} ${displayContact}: ${email.subject}</td>
          <td style="text-align:right;">${email.timestamp}</td>
        `;

        // Add event listener to load individual email details and mark as read
        emailRow.addEventListener("click", () => {
          // Mark email as read
          fetch(`/emails/${email.id}`, {
            method: "PUT",
            body: JSON.stringify({ read: true })
          });

          // Load the email details
          load_email(email.id);
        });

        // Append the email row to the table body
        document.querySelector("#mailbox-table tbody").appendChild(emailRow);
      });
    })
    .catch((error) => console.error("Error:", error));
}


function load_email(email_id) {
  // Fetch the email details
  fetch(`/emails/${email_id}`)
    .then((response) => response.json())
    .then((email) => {
      // Clear the emails-view
      const emailView = document.querySelector("#emails-view");
      emailView.innerHTML = "";

      // Get current user's email from the compose-from field
      const currentUserEmail = document.querySelector("#compose-from").value;

      // Only hide archive button for emails in Sent mailbox (where user is the sender)
      // For all other emails, show either Archive or Unarchive button
      const archiveButtonHTML = email.sender === currentUserEmail
        ? '' // Don't show any archive button for sent emails
        : `<button class="btn btn-warning" id="archive-btn">
            ${email.archived ? 'Unarchive' : 'Archive'}
           </button>`;

      // Don't show any mark as read button for sent emails
      const unreadButtonHTML = email.sender === currentUserEmail
        ? ''
        : `<button class="btn btn-primary" id="unread-btn">Mark as Unread</button>`;

      // Display the email details
      emailView.innerHTML = `
        <h3>${email.subject}</h3>
        <p><strong>From:</strong> ${email.sender}</p>
        <p><strong>To:</strong> ${email.recipients.join(", ")}</p>
        <p><strong>Timestamp:</strong> ${email.timestamp}</p>
        <hr>
        <p style="white-space: pre-wrap;">${email.body}</p>
        <hr>
        <div class="email-actions">
          <button class="btn btn-secondary" id="reply-btn">Reply</button>
          ${archiveButtonHTML}
          ${unreadButtonHTML}
        </div>
      `;

      // Mark email as read when opened
      fetch(`/emails/${email.id}`, {
        method: "PUT",
        body: JSON.stringify({ read: true })
      });

      // Add event listener for reply button
      document.querySelector("#reply-btn").addEventListener("click", () => {
        replyToEmail(email);
      });

      // Only add archive button event listener if the button exists
      const archiveBtn = document.querySelector("#archive-btn");
      if (archiveBtn) {
        archiveBtn.addEventListener("click", () => {
          // Toggle archived status
          fetch(`/emails/${email.id}`, {
            method: "PUT",
            body: JSON.stringify({ archived: !email.archived })
          })
            .then(() => {
              // After toggling archive status, load inbox
              load_mailbox("inbox");
            });
        });
      }

      // Only add unread button event listener if the button exists
      const unreadBtn = document.querySelector("#unread-btn");
      if (unreadBtn) {
        unreadBtn.addEventListener("click", () => {
          markAsUnread(email);
        });
      }
    });
}


function replyToEmail(email) {
  // Open compose view with sender's email as the recipient and subject as "Re: [original subject]"
  document.querySelector("#compose-view").style.display = "block";
  document.querySelector("#emails-view").style.display = "none";

  document.querySelector("#compose-recipients").value = email.sender;  // The recipient is the original sender
  document.querySelector("#compose-subject").value = `Re: ${email.subject}`;
  document.querySelector("#compose-body").value = `\n
  -----------------------------------------------------
  On ${email.timestamp}, ${email.sender} wrote:\n${email.body}`;

  // Add event listener to submit the form as a new email
  document.querySelector("#compose-form").onsubmit = function (event) {
    event.preventDefault();  // Prevent default form submission

    const recipients = document.querySelector("#compose-recipients").value;
    const subject = document.querySelector("#compose-subject").value;
    const body = document.querySelector("#compose-body").value;

    // Create a new email object for the reply
    const emailData = {
      recipients: recipients,
      subject: subject,
      body: body
    };

    // Send the reply email to the backend
    fetch("/emails", {
      method: "POST",
      body: JSON.stringify(emailData),
    })
      .then(response => response.json())
      .then(result => {
        // Handle success, e.g., show a confirmation, redirect, or reload the mailbox
        console.log("Reply sent:", result);
        load_mailbox("sent");  // Load the sent mailbox after replying
      })
      .catch(error => console.error("Error sending reply:", error));
  };
}



function markAsUnread(email) {
  fetch(`/emails/${email.id}`, {
    method: "PUT",
    body: JSON.stringify({ read: false })
  })
    .then(() => {
      // After marking as unread, go back to the mailbox
      load_mailbox("inbox");
    })
    .catch((error) => console.error("Error marking email as unread:", error));
}


function archiveEmail(email) {
  fetch(`/emails/${email.id}`, {
    method: "PUT",
    body: JSON.stringify({ archived: true })
  })
    .then(() => {
      // After archiving, load the current mailbox again
      load_mailbox("inbox");
    })
    .catch((error) => console.error("Error archiving email:", error));
}
