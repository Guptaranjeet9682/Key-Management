const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Anish_Gupta:Anish_Gupta@filestore.sa21pfy.mongodb.net/?retryWrites=true&w=majority";

exports.handler = async function(event, context) {
    const headers = {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }

    if (event.httpMethod === 'GET') {
        try {
            // Get query parameters
            const params = event.queryStringParameters || {};
            const device_id = params.device_id;
            const expiry_date = params.expiry_date;
            
            // Validate device_id
            if (!device_id || device_id.trim() === '') {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: 'Error: device_id is required'
                };
            }
            
            // Parse expiry date
            let expiryDateStr;
            if (expiry_date) {
                // Validate format: dd/mm/yyyy
                if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiry_date)) {
                    return {
                        statusCode: 400,
                        headers: headers,
                        body: 'Error: expiry_date must be in format dd/mm/yyyy'
                    };
                }
                expiryDateStr = expiry_date;
            } else {
                // Default: 48 hours from now
                const now = new Date();
                now.setHours(now.getHours() + 48);
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = now.getFullYear();
                expiryDateStr = `${day}/${month}/${year}`;
            }
            
            // Connect to MongoDB
            const client = new MongoClient(uri);
            await client.connect();
            const db = client.db('keychecker');
            const collection = db.collection('keys');
            
            // Prepare key data
            const keyData = {
                device_id: device_id.trim(),
                expiry_date: expiryDateStr,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: 'active'
            };
            
            // Upsert (update if exists, insert if not)
            await collection.updateOne(
                { device_id: device_id.trim() },
                { $set: keyData },
                { upsert: true }
            );
            
            await client.close();
            
            // Return in format: device_id:expiry_date
            return {
                statusCode: 200,
                headers: headers,
                body: `${device_id.trim()}:${expiryDateStr}`
            };
            
        } catch (error) {
            console.error('Error in /getkey:', error);
            return {
                statusCode: 500,
                headers: headers,
                body: `Error: ${error.message}`
            };
        }
    } else {
        return {
            statusCode: 405,
            headers: headers,
            body: 'Method not allowed'
        };
    }
};
