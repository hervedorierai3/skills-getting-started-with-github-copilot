document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

  // Clear loading message
  activitiesList.innerHTML = "";

  // Reset activity select to default to avoid duplicating options on reload
  activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Générer la liste des participants
        let participantsHTML = "";
        if (details.participants.length > 0) {
          participantsHTML = `
            <div class="participants-section">
              <strong>Participants inscrits :</strong>
              <ul class="participants-list">
                ${details.participants.map(email => `
                  <li data-email="${email}">
                    <span class="participant-email">${email}</span>
                    <button class="btn-unregister" data-activity="${name}" data-email="${email}" title="Unregister">&times;</button>
                  </li>
                `).join("")}
              </ul>
            </div>
          `;
        } else {
          participantsHTML = `
            <div class="participants-section">
              <strong>Participants inscrits :</strong>
              <p class="no-participants">Aucun participant pour le moment.</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

          // Attach event listeners for unregister buttons (delegated)
          const unregisterButtons = activityCard.querySelectorAll('.btn-unregister');
          unregisterButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const activityName = btn.getAttribute('data-activity');
              const email = btn.getAttribute('data-email');

              // Ask for confirmation before proceeding
              const ok = window.confirm(`Voulez-vous vraiment désinscrire ${email} de "${activityName}" ?`);
              if (!ok) return;

              try {
                const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, {
                  method: 'DELETE',
                });

                const payload = await res.json();
                if (res.ok) {
                  // Refresh activities so participants & availability are up-to-date
                  await fetchActivities();

                  // Highlight the updated activity card
                  highlightActivity(activityName);

                  // Show success message
                  messageDiv.textContent = payload.message || 'Participant unregistered';
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 4000);
                } else {
                  messageDiv.textContent = payload.detail || 'Failed to unregister participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 4000);
                }
              } catch (err) {
                messageDiv.textContent = 'Network error while unregistering';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                console.error('Error unregistering participant:', err);
              }
            });
          });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Highlight an activity card briefly after an update
  function highlightActivity(activityName) {
    // Find the activity card whose <h4> text matches the activityName
    const cards = activitiesList.querySelectorAll('.activity-card');
    for (const card of cards) {
      const h4 = card.querySelector('h4');
      if (h4 && h4.textContent.trim() === activityName) {
        card.classList.add('activity-updated');
        setTimeout(() => card.classList.remove('activity-updated'), 1200);
        break;
      }
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly signed up participant appears
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
