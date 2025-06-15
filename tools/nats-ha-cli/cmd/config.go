package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/homix-dev/homix/tools/nats-ha-cli/internal/client"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage configurations",
	Long:  `Commands for managing device and system configurations.`,
}

var configGetCmd = &cobra.Command{
	Use:   "get <device-id>",
	Short: "Get device configuration",
	Long:  `Get the configuration for a specific device.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		config, err := cl.GetDeviceConfig(args[0])
		if err != nil {
			return err
		}

		format, _ := cmd.Flags().GetString("output")
		switch format {
		case "json":
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(config)
		default:
			fmt.Printf("Device: %s\n", config.DeviceID)
			fmt.Printf("Name: %s\n", config.Name)
			if config.Location != "" {
				fmt.Printf("Location: %s\n", config.Location)
			}
			fmt.Printf("Enabled: %v\n", config.Enabled)
			fmt.Printf("Version: %d\n", config.Version)
			fmt.Printf("Updated: %s\n", config.UpdatedAt.Format("2006-01-02 15:04:05"))
			
			if len(config.Settings) > 0 {
				fmt.Println("\nSettings:")
				for k, v := range config.Settings {
					fmt.Printf("  %s: %v\n", k, v)
				}
			}
			
			if len(config.Thresholds) > 0 {
				fmt.Println("\nThresholds:")
				for k, v := range config.Thresholds {
					minStr := "none"
					maxStr := "none"
					if v.Min != nil {
						minStr = fmt.Sprintf("%.1f", *v.Min)
					}
					if v.Max != nil {
						maxStr = fmt.Sprintf("%.1f", *v.Max)
					}
					fmt.Printf("  %s: min=%s, max=%s", k, minStr, maxStr)
					if v.Unit != "" {
						fmt.Printf(" (%s)", v.Unit)
					}
					if v.Action != "" {
						fmt.Printf(" - action: %s", v.Action)
					}
					fmt.Println()
				}
			}
		}
		
		return nil
	},
}

var configSetCmd = &cobra.Command{
	Use:   "set <device-id>",
	Short: "Set device configuration",
	Long:  `Set or update the configuration for a device.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		deviceID := args[0]
		
		// Get flags
		name, _ := cmd.Flags().GetString("name")
		location, _ := cmd.Flags().GetString("location")
		enabled, _ := cmd.Flags().GetBool("enabled")
		setting, _ := cmd.Flags().GetStringSlice("set")
		
		// Get current config or create new
		config, err := cl.GetDeviceConfig(deviceID)
		if err != nil {
			// Create new config
			config = &client.DeviceConfig{
				DeviceID: deviceID,
				Enabled:  true,
				Settings: make(map[string]interface{}),
			}
		}
		
		// Update fields
		if cmd.Flags().Changed("name") {
			config.Name = name
		}
		if cmd.Flags().Changed("location") {
			config.Location = location
		}
		if cmd.Flags().Changed("enabled") {
			config.Enabled = enabled
		}
		
		// Parse settings
		for _, s := range setting {
			var key string
			var value interface{}
			if n, err := fmt.Sscanf(s, "%s=%v", &key, &value); n == 2 && err == nil {
				config.Settings[key] = value
			}
		}
		
		deviceType, _ := cmd.Flags().GetString("type")
		if err := cl.SetDeviceConfig(config, deviceType); err != nil {
			return err
		}
		
		fmt.Printf("Configuration updated for device '%s'\n", deviceID)
		return nil
	},
}

var configListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all device configurations",
	Long:  `List configurations for all devices.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		configs, err := cl.ListDeviceConfigs()
		if err != nil {
			return err
		}

		format, _ := cmd.Flags().GetString("output")
		switch format {
		case "json":
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(configs)
		default:
			w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
			fmt.Fprintln(w, "DEVICE\tNAME\tLOCATION\tENABLED\tVERSION")
			fmt.Fprintln(w, "------\t----\t--------\t-------\t-------")
			
			for _, config := range configs {
				fmt.Fprintf(w, "%s\t%s\t%s\t%v\t%d\n",
					config.DeviceID,
					config.Name,
					config.Location,
					config.Enabled,
					config.Version,
				)
			}
			return w.Flush()
		}
	},
}

var configBackupCmd = &cobra.Command{
	Use:   "backup",
	Short: "Create configuration backup",
	Long:  `Create a backup of all device and system configurations.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		description, _ := cmd.Flags().GetString("description")
		
		backup, err := cl.CreateBackup(description)
		if err != nil {
			return err
		}
		
		fmt.Printf("Backup created successfully\n")
		fmt.Printf("ID: %s\n", backup.ID)
		fmt.Printf("Devices: %d\n", len(backup.DeviceConfigs))
		fmt.Printf("Size: %d bytes\n", backup.Size)
		
		// Save to file if requested
		if file, _ := cmd.Flags().GetString("file"); file != "" {
			data, err := json.MarshalIndent(backup, "", "  ")
			if err != nil {
				return err
			}
			if err := os.WriteFile(file, data, 0644); err != nil {
				return err
			}
			fmt.Printf("Saved to: %s\n", file)
		}
		
		return nil
	},
}

var configRestoreCmd = &cobra.Command{
	Use:   "restore <backup-id|file>",
	Short: "Restore configuration from backup",
	Long:  `Restore device and system configurations from a backup.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cl, err := client.New(natsURL, natsUser, natsPass)
		if err != nil {
			return err
		}
		defer cl.Close()

		force, _ := cmd.Flags().GetBool("force")
		
		if !force {
			fmt.Printf("Are you sure you want to restore from backup? This will overwrite current configurations. (y/N): ")
			var confirm string
			fmt.Scanln(&confirm)
			if confirm != "y" && confirm != "Y" {
				fmt.Println("Cancelled")
				return nil
			}
		}
		
		// Check if arg is a file
		if _, err := os.Stat(args[0]); err == nil {
			// Load from file
			data, err := os.ReadFile(args[0])
			if err != nil {
				return err
			}
			var backup client.ConfigBackup
			if err := json.Unmarshal(data, &backup); err != nil {
				return err
			}
			// TODO: Implement file-based restore
			return fmt.Errorf("file-based restore not yet implemented")
		}
		
		// Restore by ID
		if err := cl.RestoreBackup(args[0]); err != nil {
			return err
		}
		
		fmt.Println("Configuration restored successfully")
		return nil
	},
}

func init() {
	// Add config command to root
	rootCmd.AddCommand(configCmd)

	// Add subcommands
	configCmd.AddCommand(configGetCmd)
	configCmd.AddCommand(configSetCmd)
	configCmd.AddCommand(configListCmd)
	configCmd.AddCommand(configBackupCmd)
	configCmd.AddCommand(configRestoreCmd)

	// Get command flags
	configGetCmd.Flags().StringP("output", "f", "text", "Output format (text, json)")

	// Set command flags
	configSetCmd.Flags().StringP("name", "n", "", "Device name")
	configSetCmd.Flags().StringP("location", "l", "", "Device location")
	configSetCmd.Flags().Bool("enabled", true, "Enable/disable device")
	configSetCmd.Flags().StringSliceP("set", "s", []string{}, "Set configuration value (key=value)")
	configSetCmd.Flags().StringP("type", "t", "", "Device type (for validation)")

	// List command flags
	configListCmd.Flags().StringP("output", "f", "table", "Output format (table, json)")

	// Backup command flags
	configBackupCmd.Flags().StringP("description", "d", "", "Backup description")
	configBackupCmd.Flags().StringP("file", "f", "", "Save backup to file")

	// Restore command flags
	configRestoreCmd.Flags().Bool("force", false, "Skip confirmation")
}