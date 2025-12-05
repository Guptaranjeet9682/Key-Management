const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Anish_Gupta:Anish_Gupta@filestore.sa21pfy.mongodb.net/?retryWrites=true&w=majority";

exports.handler = async function(event, context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    if (event.httpMethod === 'POST') {
        let client = null;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('keychecker');
            const collection = db.collection('keys');
            
            // Get all keys
            const allKeys = await collection.find({}).toArray();
            const now = new Date();
            
            // Find expired keys
            const expiredKeys = allKeys.filter(key => {
                const [day, month, year] = key.expiry_date.split('/').map(Number);
                const expiryDate = new Date(year, month - 1, day);
                return expiryDate < now;
            });
            
            if (expiredKeys.length === 0) {
                return {
                    statusCode: 200,
                    headers: headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'No expired keys found',
                        deleted_count: 0
                    }, null, 2)
                };
            }
            
            // Delete expired keys
            const expiredDeviceIds = expiredKeys.map(k => k.device_id);
            const result = await collection.deleteMany({
                device_id: { $in: expiredDeviceIds }
            });
            
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    message: `Deleted ${result.deletedCount} expired keys`,
                    deleted_count: result.deletedCount,
                    deleted_keys: expiredKeys.map(k => ({
                        device_id: k.device_id,
                        expiry_date: k.expiry_date
                    }))
                }, null, 2)
            };
            
        } catch (error) {
            console.error('Error in /delete-expired:', error);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server error',
                    details: error.message
                })
            };
        } finally {
            if (client) {
                await client.close();
            }
        }
    } else {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
};
