const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Anish_Gupta:Anish_Gupta@filestore.sa21pfy.mongodb.net/?retryWrites=true&w=majority";

exports.handler = async function(event, context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
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

    if (event.httpMethod === 'GET' || event.httpMethod === 'DELETE') {
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
                        message: 'Use: /delete/device_id?id=your_device_id'
                    })
                };
            }
            
            // Connect to MongoDB
            const client = new MongoClient(uri);
            await client.connect();
            const db = client.db('keychecker');
            const collection = db.collection('keys');
            
            // Find the device first to check if it exists
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
            
            // Delete the device
            const result = await collection.deleteOne({ 
                device_id: device_id.trim() 
            });
            
            await client.close();
            
            if (result.deletedCount === 1) {
                return {
                    statusCode: 200,
                    headers: headers,
                    body: JSON.stringify({
                        success: true,
                        message: `Device '${device_id.trim()}' deleted successfully`,
                        device_id: device_id.trim(),
                        expiry_date: device.expiry_date,
                        deleted: true,
                        timestamp: new Date().toISOString()
                    }, null, 2)
                };
            } else {
                return {
                    statusCode: 500,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Deletion failed',
                        message: 'Device could not be deleted'
                    })
                };
            }
            
        } catch (error) {
            console.error('Error in /delete:', error);
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
