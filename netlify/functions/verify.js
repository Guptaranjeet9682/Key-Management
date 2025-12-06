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
            // Extract device_id from query parameters
            const params = event.queryStringParameters || {};
            let device_id = params.id || params.device_id;
            
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
                        message: 'Use: /verify/device_id?id=your_device_id'
                    })
                };
            }
            
            // Connect to MongoDB
            const client = new MongoClient(uri);
            await client.connect();
            const db = client.db('keychecker');
            const collection = db.collection('keys');
            
            // Find device by device_id
            const device = await collection.findOne({ 
                device_id: device_id.trim() 
            });
            
            if (!device) {
                await client.close();
                return {
                    statusCode: 404,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        device_id: device_id.trim(),
                        status: 'not_found',
                        message: 'Device ID not found in database'
                    })
                };
            }
            
            // Check if expired
            const [day, month, year] = device.expiry_date.split('/').map(Number);
            const expiryDate = new Date(year, month - 1, day);
            const now = new Date();
            const isExpired = expiryDate < now;
            
            // Calculate days and hours remaining
            const diffTime = expiryDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
            
            await client.close();
            
            // Return JSON response
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    device_id: device.device_id,
                    expiry_date: device.expiry_date,
                    status: isExpired ? 'expired' : 'valid',
                    days_remaining: isExpired ? 0 : diffDays,
                    hours_remaining: isExpired ? 0 : diffHours,
                    created_at: device.created_at,
                    last_updated: device.updated_at,
                    message: isExpired ? 'Key has expired' : 'Key is valid'
                }, null, 2)
            };
            
        } catch (error) {
            console.error('Error in /verify:', error);
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
