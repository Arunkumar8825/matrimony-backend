const path = require('path');
const fs = require('fs');

const loadTemplate = (templateName, data) => {
  try {
    // In production, you'd load from files or database
    // For now, using inline templates
    
    const templates = {
      // Welcome email template
      welcome: (user) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* ... styles ... */
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Yadhavar Matrimony!</h1>
            </div>
            <div class="content">
              <h2>Namaste ${user.firstName} ${user.lastName},</h2>
              <p>Welcome to our exclusive matrimonial service for the Yadhavar community.</p>
              <p>Your account has been successfully created. Here are your next steps:</p>
              <ol>
                <li>Complete your profile to increase matches</li>
                <li>Verify your email and phone number</li>
                <li>Upload clear profile photos</li>
                <li>Set your partner preferences</li>
              </ol>
              <p>Start finding your perfect match today!</p>
              <div class="button-container">
                <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>Regards,<br>Yadhavar Matrimony Team</p>
              <p class="small">This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      // Interest received template
      interestReceived: (data) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>/* ... styles ... */</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Interest Received!</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.receiverName},</h2>
              <p>Great news! Someone is interested in your profile.</p>
              
              <div class="profile-card">
                <div class="profile-header">
                  <h3>${data.senderName}</h3>
                  <p>${data.senderAge} years • ${data.senderProfession}</p>
                </div>
                <div class="profile-details">
                  <p><strong>Location:</strong> ${data.senderLocation}</p>
                  <p><strong>Education:</strong> ${data.senderEducation}</p>
                  ${data.message ? `<p><strong>Message:</strong> "${data.message}"</p>` : ''}
                </div>
              </div>
              
              <p>Login to your account to view the complete profile and respond.</p>
              
              <div class="button-container">
                <a href="${process.env.CLIENT_URL}/interests/received" class="button">View Interest</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,

      // Password reset template
      passwordReset: (data) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>/* ... styles ... */</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.name},</h2>
              <p>You requested to reset your password. Click the button below to proceed:</p>
              
              <div class="button-container">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>This link will expire in 15 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      // Profile verified template
      profileVerified: (user) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>/* ... styles ... */</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Profile Verified!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${user.firstName}!</h2>
              <p>Your profile has been successfully verified by our team.</p>
              <p>Your profile now has a verified badge and will be shown to more potential matches.</p>
              
              <div class="benefits">
                <h3>Benefits of verified profile:</h3>
                <ul>
                  <li>✅ Increased trust among members</li>
                  <li>✅ Higher visibility in search results</li>
                  <li>✅ More profile views and interests</li>
                  <li>✅ Priority customer support</li>
                </ul>
              </div>
              
              <div class="button-container">
                <a href="${process.env.CLIENT_URL}/profile" class="button">View Your Profile</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,

      // Premium subscription activated
      premiumActivated: (user, plan) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>/* ... styles ... */</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎊 Premium Subscription Activated!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${user.firstName}!</h2>
              <p>Your ${plan.name} subscription has been activated successfully.</p>
              <p><strong>Subscription Details:</strong></p>
              <ul>
                <li><strong>Plan:</strong> ${plan.name}</li>
                <li><strong>Duration:</strong> ${plan.duration} months</li>
                <li><strong>Amount Paid:</strong> ₹${plan.price}</li>
                <li><strong>Valid Until:</strong> ${plan.expiryDate}</li>
              </ul>
              
              <div class="features">
                <h3>Premium Features Unlocked:</h3>
                <ul>
                  ${plan.features.map(feature => `<li>✅ ${feature}</li>`).join('')}
                </ul>
              </div>
              
              <p>Start exploring premium features now!</p>
              
              <div class="button-container">
                <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,

      // Daily matches template
      dailyMatches: (user, matches) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>/* ... styles ... */</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌟 Your Daily Matches</h1>
            </div>
            <div class="content">
              <h2>Good morning, ${user.firstName}!</h2>
              <p>Here are your personalized matches for today:</p>
              
              ${matches.map((match, index) => `
                <div class="match-card">
                  <div class="match-header">
                    <h3>${match.name}, ${match.age}</h3>
                    <span class="match-score">${match.score}% Match</span>
                  </div>
                  <div class="match-details">
                    <p><strong>Profession:</strong> ${match.profession}</p>
                    <p><strong>Location:</strong> ${match.location}</p>
                    <p><strong>Education:</strong> ${match.education}</p>
                  </div>
                  <a href="${process.env.CLIENT_URL}/profile/${match.id}" class="view-button">View Profile</a>
                </div>
              `).join('')}
              
              <div class="button-container">
                <a href="${process.env.CLIENT_URL}/matches" class="button">View All Matches</a>
              </div>
              
              <p class="footer-text">Happy matchmaking!<br>Yadhavar Matrimony Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    if (!templates[templateName]) {
      throw new Error(`Template ${templateName} not found`);
    }

    return templates[templateName](data);
  } catch (error) {
    console.error('Template loading error:', error);
    throw error;
  }
};

module.exports = { loadTemplate };