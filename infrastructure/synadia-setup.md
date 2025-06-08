# Synadia Cloud Setup Guide

## Step 1: Create Synadia Cloud Account

1. Visit [https://app.ngs.global](https://app.ngs.global)
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Create Your First NATS Cluster

1. After logging in, click "Create Team" or use the default team
2. Navigate to "Clusters" in the left sidebar
3. Click "Create Cluster"
4. Configure your cluster:
   - Name: `home-automation`
   - Region: Choose the closest to your location
   - Size: Start with the free tier (1 node)
5. Click "Create"

## Step 3: Generate Credentials

1. Once the cluster is created, click on it
2. Go to the "Security" tab
3. Click "Create User"
   - Name: `home-automation-user`
   - Permissions: Full access (for now)
4. Download the credentials file (`.creds` file)
5. Save it as `infrastructure/nats-home-automation.creds`

## Step 4: Note Your Connection Details

From the cluster overview page, note:
- Connection URL (e.g., `tls://connect.ngs.global`)
- Your account ID
- Your user ID

These will be needed for configuring leaf nodes and client connections.

## Next Steps

After completing the Synadia Cloud setup:
1. Install the local NATS server
2. Configure leaf node connection
3. Test the connection

For more details, see the official Synadia documentation:
- [Getting Started Guide](https://docs.synadia.com/cloud/getting-started)
- [NATS Leaf Nodes](https://docs.nats.io/running-a-nats-service/configuration/leafnodes)