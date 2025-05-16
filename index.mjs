// index.mjs
import { parse } from "csv-parse/sync";
import xlsx from "xlsx";
import { Buffer } from "buffer";

export const handler = async (event) => {
  // Handle GET Request — Event Card Generator
  if (event.httpMethod === 'GET') {
    const {
      title = 'Event Invitation',
      names = 'John & Jane',
      date = '2025-05-18',
      time = '15:10',
      location = 'San Francisco, CA',
      description = 'Join us for this special event.',
      organizer = 'Event Organizer',
      contact = '123-456-7890',
      rsvpLink = '',
      category = '',
      socialMedia = '',
      agenda = '',
      speakers = '',
      fees = '',
      audience = '',
      dressCode = '',
      qrCode = '',
    } = event.queryStringParameters || {};

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <style>
            body {
                background-image: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbwalz6n2X0oTW8HMlFXGCL7tpLGtfXQMc2Q&s');
                background-size: cover;
                background-repeat: no-repeat;
                background-position: center;
                font-family: 'Georgia', serif;
                text-align: center;
                color: #fff;
                padding: 50px;
                margin: 0;
            }
            .overlay {
                background: rgba(0, 0, 0, 0.6);
                padding: 40px;
                border-radius: 15px;
                width: 80%;
                margin: auto;
                box-shadow: 0 0 20px #000;
            }
            .title { font-size: 48px; color: #ffe6ff; margin-bottom: 10px; }
            .subtitle { font-size: 24px; margin: 10px 0; }
            .details { font-size: 18px; margin: 8px 0; }
            .divider { border-top: 1px solid #fff; margin: 20px auto; width: 60%; }
            .date-time {
                font-size: 22px;
                background-color: rgba(255, 255, 255, 0.7);
                color: #4a0a4a;
                display: inline-block;
                padding: 10px 25px;
                border-radius: 10px;
                text-shadow: none;
                margin-top: 15px;
            }
            .btn {
                display: inline-block;
                padding: 12px 24px;
                background-color: #fff;
                color: #4a0a4a;
                text-decoration: none;
                border-radius: 8px;
                margin-top: 20px;
                font-weight: bold;
                box-shadow: 0 0 10px #000;
            }
            img.qr {
                margin-top: 20px;
                width: 140px;
                height: 140px;
            }
        </style>
    </head>
    <body>
        <div class="overlay">
            <div class="title">${title}</div>
            <div class="subtitle">${description}</div>
            <div class="divider"></div>
            <div class="subtitle">In honor of: <b>${names}</b></div>
            <div class="subtitle">Hosted by: <b>${organizer}</b></div>
            <div class="subtitle">Category: <b>${category || 'General'}</b></div>
            <div class="divider"></div>
            <div class="subtitle">Featuring: <b>${speakers || 'Special Guests'}</b></div>
            <div class="date-time">${date}<br>${time}</div>
            <div class="divider"></div>
            <div class="details">Location: <b>${location}</b></div>
            <div class="details">Audience: <b>${audience || 'Open to All'}</b></div>
            <div class="details">Dress Code: <b>${dressCode || 'None specified'}</b></div>
            <div class="details">Fees: <b>${fees || 'Free'}</b></div>
            <div class="details">Agenda: <b>${agenda || 'To be announced'}</b></div>
            <div class="divider"></div>
            <div class="details">Contact: <b>${contact}</b></div>
            ${socialMedia ? <div class="details">Follow us: <a href="${socialMedia}" style="color: #ffd; text-decoration: underline;">${socialMedia}</a></div> : ''}
            ${rsvpLink ? <a href="${rsvpLink}" class="btn">RSVP Now</a> : ''}
            ${qrCode ? <div><img class="qr" src="${qrCode}" alt="QR Code"></div> : ''}
        </div>
    </body>
    </html>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: html
    };
  }

  // Handle POST Request — Multiple Business Card File Upload
  if (event.httpMethod === 'POST') {
    try {
      const isBase64 = event.isBase64Encoded;
      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      const bodyBuffer = isBase64 ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8');

      let fileBuffer;

      // Handle multipart/form-data
      if (contentType.includes('multipart/form-data')) {
        const boundary = contentType.split('boundary=')[1];
        const parts = bodyBuffer.toString().split(--${boundary});
        for (const part of parts) {
          if (part.includes('filename=')) {
            const match = part.match(/\r\n\r\n([\s\S]*?)\r\n--/);
            if (match) {
              fileBuffer = Buffer.from(match[1], 'utf8');
              break;
            }
          }
        }
      } else {
        fileBuffer = bodyBuffer;
      }

      if (!fileBuffer) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "No file uploaded." })
        };
      }

      let dataRows = [];

      try {
        // Try Excel first
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        dataRows = xlsx.utils.sheet_to_json(sheet);
      } catch (excelErr) {
        try {
          // Try CSV fallback
          const text = fileBuffer.toString();
          dataRows = parse(text, { columns: true, skip_empty_lines: true });
        } catch (csvErr) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid file format. Upload a valid CSV or Excel file." })
          };
        }
      }

      // Group by Designation
      const grouped = {};
      dataRows.forEach(entry => {
        const group = entry.Designation || 'Others';
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(entry);
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: "Successfully processed bulk business cards.",
          groupedCards: grouped
        })
      };

    } catch (err) {
      console.error("Error parsing upload:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error", details: err.message })
      };
    }
  }

  // Handle OPTIONS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  // Default for unsupported methods
  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Method Not Allowed' })
  };
};