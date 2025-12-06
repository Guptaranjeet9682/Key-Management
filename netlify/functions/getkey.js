const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Anish_Gupta:Anish_Gupta@filestore.sa21pfy.mongodb.net/?retryWrites=true&w=majority";

exports.handler = async function(event, context) {
    const headers = {
        'Content-Type': 'application/json',
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
            let device_id = params.device_id;
            const expiry_date = params.expiry_date;
            
            // Clean device_id - remove everything after ":" if present
            if (device_id && device_id.includes(':')) {
                device_id = device_id.split(':')[0].trim();
            }
            
            // Validate device_id
            if (!device_id || device_id.trim() === '') {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'device_id is required',
                        message: 'Please provide a valid device ID'
                    })
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
                        body: JSON.stringify({
                            success: false,
                            error: 'Invalid date format',
                            message: 'expiry_date must be in format dd/mm/yyyy'
                        })
                    };
                }
                expiryDateStr = expiry_date;
            } else {
                // Default: 120 hours (5 days) from now
                const now = new Date();
                now.setHours(now.getHours() + 120);
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
            
            // Check if device exists
            const existingKey = await collection.findOne({ device_id: device_id.trim() });
            const isUpdate = existingKey ? true : false;
            
            // Prepare key data
            const now = new Date();
            const keyData = {
                device_id: device_id.trim(),
                expiry_date: expiryDateStr,
                created_at: isUpdate ? existingKey.created_at : now.toISOString(),
                updated_at: now.toISOString(),
                status: 'active'
            };
            
            // Upsert (update if exists, insert if not)
            await collection.updateOne(
                { device_id: device_id.trim() },
                { $set: keyData },
                { upsert: true }
            );
            
            await client.close();
            
            // Return detailed JSON response
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    message: isUpdate ? 'Key updated successfully' : 'Key generated successfully',
                    device_id: device_id.trim(),
                    expiry_date: expiryDateStr,
                    status: 'active',
                    hours_valid: 120,
                    created_at: keyData.created_at,
                    last_updated: keyData.updated_at,
                    format: `${device_id.trim()}:${expiryDateStr}`
                }, null, 2)
            };
            
        } catch (error) {
            console.error('Error in /getkey:', error);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server error',
                    message: error.message
                })
            };
        }
    } else {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Method not allowed' 
            })
        };
    }
};
