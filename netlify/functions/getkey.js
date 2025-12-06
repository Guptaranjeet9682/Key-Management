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
            const device_id = params.device_id;
            const expiry_date = params.expiry_date;
            
            // Validate device_id
            if (!device_id || device_id.trim() === '') {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'device_id is required',
                        message: 'Please provide a device_id parameter'
                    }, null, 2)
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
                            message: 'expiry_date must be in format DD/MM/YYYY'
                        }, null, 2)
                    };
                }
                expiryDateStr = expiry_date;
            } else {
                // CHANGED: Default: 120 hours (5 days) from now
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
            
            // Check if device already exists
            const existingKey = await collection.findOne({ device_id: device_id.trim() });
            
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
            
            // NEW: Return JSON response with details (similar to verify)
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    message: existingKey ? 'Key updated successfully' : 'Key generated successfully',
                    device_id: device_id.trim(),
                    expiry_date: expiryDateStr,
                    status: 'active',
                    created_at: keyData.created_at,
                    last_updated: keyData.updated_at,
                    key_format: `${device_id.trim()}:${expiryDateStr}`,
                    note: 'Use device_id:expiry_date format for /keys endpoint'
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
                }, null, 2)
            };
        }
    } else {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Method not allowed' 
            }, null, 2)
        };
    }
};
