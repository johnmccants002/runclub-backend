export const generateEventEmailTemplate = (
  title,
  details,
  startTime,
  endTime,
  location
) => {
  return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            background-color: #fff;
          }
          .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .header {
            text-align: center;
            padding-bottom: 10px;
          }
          .header h1 {
            color: #000;
            font-size: 24px;
            margin: 0;
          }
          .content {
            margin-top: 10px;
          }
          .content p {
            margin: 8px 0;
            color: #000;
          }
          .event-details {
            background-color: #f9f9f9;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-bottom: 10px;
          }
          .event-details h3 {
            color: #000;
            font-size: 18px;
            margin: 0;
          }
          .event-details p {
            margin: 5px 0;
            color: #555;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Dear Runner,</p>
            <p>We are excited to announce a new event! Below are the details:</p>

            <div class="event-details">
              <h3>Event Details:</h3>
              <p><strong>Event:</strong> ${title}</p>
              <p><strong>Details:</strong> ${details}</p>
              <p><strong>Start Time:</strong> ${new Date(
                startTime
              ).toLocaleString()}</p>
              <p><strong>End Time:</strong> ${new Date(
                endTime
              ).toLocaleString()}</p>
              <p><strong>Location:</strong> ${location.name}, ${
    location.formatted_address
  }</p>
            </div>

            <p>We look forward to seeing you at the event!</p>
          </div>

          <div class="footer">
            <p>&copy; 916 Run Club. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
