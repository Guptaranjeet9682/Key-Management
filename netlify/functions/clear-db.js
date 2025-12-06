const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Anish_Gupta:Anish_Gupta@filestore.sa21pfy.mongodb.net/?retryWrites=true&w=majority";
const ADMIN_KEY = "8195";

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
        try {
            // Parse request body
            let body;
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid JSON in request body'
                    })
                };
            }
            
            const { admin_key } = body;
            
            // Verify admin key
            if (!admin_key || admin_key !== ADMIN_KEY) {
                return {
                    statusCode: 403,
                    headers: headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Access denied',
                        message: 'Invalid admin key'
                    })
                };
            }
            
            // Connect to MongoDB
            const client = new MongoClient(uri);
            await client.connect();
            const db = client.db('keychecker');
            const collection = db.collection('keys');
            
            // Get count before deletion
            const countBefore = await collection.countDocuments();
            
            // Delete ALL documents
            const result = await collection.deleteMany({});
            
            await client.close();
            
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    message: `Database cleared successfully. Deleted ${result.deletedCount} keys.`,
                    deleted_count: result.deletedCount,
                    previous_count: countBefore,
                    timestamp: new Date().toISOString(),
                    warning: 'All data has been permanently deleted!'
                }, null, 2)
            };
            
        } catch (error) {
            console.error('Error in /clear-db:', error);
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
