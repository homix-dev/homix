package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"
	"time"

	"github.com/homix-dev/homix/tools/nats-ha-cli/internal/client"
	"github.com/spf13/cobra"
)

var deviceCmd = &cobra.Command{
	Use:   "device",
	Short: "Manage devices",
	Long:  `Commands for managing devices in the home automation system.`,
}

var deviceListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all devices",
	Long:  `List all registered devices in the system.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		deviceType, _ := cmd.Flags().GetString("type")
		onlineOnly, _ := cmd.Flags().GetBool("online")

		devices, err := cl.ListDevices(deviceType, onlineOnly)
		if err != nil {
			return err
		}

		// Format output
		format, _ := cmd.Flags().GetString("output")
		switch format {
		case "json":
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(devices)
		default:
			w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
			fmt.Fprintln(w, "ID\tTYPE\tNAME\tSTATUS\tLAST SEEN")
			fmt.Fprintln(w, "---\t----\t----\t------\t---------")
			
			for _, device := range devices {
				status := "offline"
				if device.Status.Online {
					status = "online"
				}
				lastSeen := device.Status.LastSeen.Format("15:04:05")
				fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n",
					device.DeviceID,
					device.DeviceType,
					device.Name,
					status,
					lastSeen,
				)
			}
			return w.Flush()
		}
	},
}

var deviceGetCmd = &cobra.Command{
	Use:   "get <device-id>",
	Short: "Get device details",
	Long:  `Get detailed information about a specific device.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		device, err := cl.GetDevice(args[0])
		if err != nil {
			return err
		}

		// Format output
		format, _ := cmd.Flags().GetString("output")
		switch format {
		case "json":
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(device)
		default:
			fmt.Printf("Device ID: %s\n", device.DeviceID)
			fmt.Printf("Name: %s\n", device.Name)
			fmt.Printf("Type: %s\n", device.DeviceType)
			fmt.Printf("Manufacturer: %s\n", device.Manufacturer)
			fmt.Printf("Model: %s\n", device.Model)
			fmt.Printf("Status: %s\n", func() string {
				if device.Status.Online {
					return "online"
				}
				return "offline"
			}())
			fmt.Printf("Last Seen: %s\n", device.Status.LastSeen.Format(time.RFC3339))
			
			if len(device.Capabilities.Sensors) > 0 {
				fmt.Printf("\nSensors:\n")
				for _, sensor := range device.Capabilities.Sensors {
					fmt.Printf("  - %s\n", sensor)
				}
			}
			
			if len(device.Capabilities.Actuators) > 0 {
				fmt.Printf("\nActuators:\n")
				for _, actuator := range device.Capabilities.Actuators {
					fmt.Printf("  - %s\n", actuator)
				}
			}
			
			if len(device.Topics.State) > 0 {
				fmt.Printf("\nTopics:\n")
				fmt.Printf("  State: %s\n", device.Topics.State)
				if device.Topics.Command != "" {
					fmt.Printf("  Command: %s\n", device.Topics.Command)
				}
				if device.Topics.Status != "" {
					fmt.Printf("  Status: %s\n", device.Topics.Status)
				}
			}
		}
		
		return nil
	},
}

var deviceDeleteCmd = &cobra.Command{
	Use:   "delete <device-id>",
	Short: "Delete a device",
	Long:  `Remove a device from the registry.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		force, _ := cmd.Flags().GetBool("force")
		
		if !force {
			fmt.Printf("Are you sure you want to delete device '%s'? (y/N): ", args[0])
			var confirm string
			fmt.Scanln(&confirm)
			if confirm != "y" && confirm != "Y" {
				fmt.Println("Cancelled")
				return nil
			}
		}

		if err := cl.DeleteDevice(args[0]); err != nil {
			return err
		}

		fmt.Printf("Device '%s' deleted successfully\n", args[0])
		return nil
	},
}

var deviceAnnounceCmd = &cobra.Command{
	Use:   "announce",
	Short: "Announce a new device",
	Long:  `Announce a new device to the discovery service.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		// Get device info from flags
		deviceID, _ := cmd.Flags().GetString("id")
		deviceType, _ := cmd.Flags().GetString("type")
		name, _ := cmd.Flags().GetString("name")
		manufacturer, _ := cmd.Flags().GetString("manufacturer")
		model, _ := cmd.Flags().GetString("model")

		if deviceID == "" || deviceType == "" {
			return fmt.Errorf("device ID and type are required")
		}

		device := map[string]interface{}{
			"device_id":     deviceID,
			"device_type":   deviceType,
			"name":          name,
			"manufacturer":  manufacturer,
			"model":         model,
			"capabilities":  map[string]interface{}{},
			"topics": map[string]string{
				"state":  fmt.Sprintf("home.devices.%s.%s.state", deviceType, deviceID),
				"status": fmt.Sprintf("home.devices.%s.%s.status", deviceType, deviceID),
			},
		}

		if err := cl.AnnounceDevice(device); err != nil {
			return err
		}

		fmt.Printf("Device '%s' announced successfully\n", deviceID)
		return nil
	},
}

func init() {
	// Add device command to root
	rootCmd.AddCommand(deviceCmd)

	// Add subcommands
	deviceCmd.AddCommand(deviceListCmd)
	deviceCmd.AddCommand(deviceGetCmd)
	deviceCmd.AddCommand(deviceDeleteCmd)
	deviceCmd.AddCommand(deviceAnnounceCmd)

	// List command flags
	deviceListCmd.Flags().StringP("type", "t", "", "Filter by device type")
	deviceListCmd.Flags().BoolP("online", "o", false, "Show only online devices")
	deviceListCmd.Flags().StringP("output", "f", "table", "Output format (table, json)")

	// Get command flags
	deviceGetCmd.Flags().StringP("output", "f", "text", "Output format (text, json)")

	// Delete command flags
	deviceDeleteCmd.Flags().BoolP("force", "f", false, "Skip confirmation")

	// Announce command flags
	deviceAnnounceCmd.Flags().StringP("id", "i", "", "Device ID")
	deviceAnnounceCmd.Flags().StringP("type", "t", "", "Device type")
	deviceAnnounceCmd.Flags().StringP("name", "n", "", "Device name")
	deviceAnnounceCmd.Flags().String("manufacturer", "", "Device manufacturer")
	deviceAnnounceCmd.Flags().String("model", "", "Device model")
}