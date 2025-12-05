const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Anish_Gupta:Anish_Gupta@filestore.sa21pfy.mongodb.net/?retryWrites=true&w=majority";

exports.handler = async function(event, context) {
    // Set CORS headers
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
        let client = null;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('keychecker');
            const collection = db.collection('keys');
            
            // Get current date
            const now = new Date();
            
            // Get all keys
            const allKeys = await collection.find({}).toArray();
            
            // Auto-delete expired keys
            const expiredKeys = [];
            const activeKeys = [];
            
            for (const key of allKeys) {
                // Parse expiry date from dd/mm/yyyy
                const [day, month, year] = key.expiry_date.split('/').map(Number);
                const expiryDate = new Date(year, month - 1, day);
                
                if (expiryDate < now) {
                    expiredKeys.push(key.device_id);
                } else {
                    activeKeys.push(key);
                }
            }
            
            // Delete expired keys from database
            if (expiredKeys.length > 0) {
                await collection.deleteMany({ device_id: { $in: expiredKeys } });
                console.log(`Auto-deleted ${expiredKeys.length} expired keys`);
            }
            
            // Format output: device_id:expiry_date (one per line)
            const output = activeKeys
                .map(key => `${key.device_id}:${key.expiry_date}`)
                .join('\n');
            
            return {
                statusCode: 200,
                headers: headers,
                body: output || 'No active keys'
            };
            
        } catch (error) {
            console.error('Error in /keys:', error);
            return {
                statusCode: 500,
                headers: headers,
                body: `Error: ${error.message}`
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
            body: 'Method not allowed'
        };
    }
};
