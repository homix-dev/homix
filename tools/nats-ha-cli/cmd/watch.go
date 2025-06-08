package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/spf13/cobra"
)

var watchCmd = &cobra.Command{
	Use:   "watch",
	Short: "Watch for real-time events",
	Long:  `Subscribe to real-time events from the home automation system.`,
}

var watchStatesCmd = &cobra.Command{
	Use:   "states [device-type]",
	Short: "Watch device state changes",
	Long:  `Watch real-time device state changes. Optionally filter by device type.`,
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		// Connect to NATS
		opts := []nats.Option{
			nats.Name("nats-ha-watcher"),
		}
		if natsUser != "" && natsPass != "" {
			opts = append(opts, nats.UserInfo(natsUser, natsPass))
		}

		nc, err := nats.Connect(natsURL, opts...)
		if err != nil {
			return fmt.Errorf("failed to connect: %w", err)
		}
		defer nc.Close()

		// Build subject
		subject := "home.devices.*.*.state"
		if len(args) > 0 {
			subject = fmt.Sprintf("home.devices.%s.*.state", args[0])
		}

		// Subscribe
		sub, err := nc.Subscribe(subject, func(msg *nats.Msg) {
			var data map[string]interface{}
			if err := json.Unmarshal(msg.Data, &data); err != nil {
				fmt.Printf("Error parsing message: %v\n", err)
				return
			}

			// Extract device info from subject
			parts := strings.Split(msg.Subject, ".")
			if len(parts) >= 4 {
				deviceType := parts[2]
				deviceID := parts[3]

				timestamp := data["timestamp"]
				state := data["state"]

				fmt.Printf("[%s] %s/%s: %v\n", 
					timestamp, 
					deviceType, 
					deviceID,
					state,
				)
			}
		})
		if err != nil {
			return err
		}
		defer sub.Unsubscribe()

		fmt.Printf("Watching for state changes on: %s\n", subject)
		fmt.Println("Press Ctrl+C to stop...")

		// Wait for interrupt
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		fmt.Println("\nStopping...")
		return nil
	},
}

var watchEventsCmd = &cobra.Command{
	Use:   "events [event-type]",
	Short: "Watch system events",
	Long:  `Watch real-time system events. Optionally filter by event type.`,
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		// Connect to NATS
		opts := []nats.Option{
			nats.Name("nats-ha-watcher"),
		}
		if natsUser != "" && natsPass != "" {
			opts = append(opts, nats.UserInfo(natsUser, natsPass))
		}

		nc, err := nats.Connect(natsURL, opts...)
		if err != nil {
			return fmt.Errorf("failed to connect: %w", err)
		}
		defer nc.Close()

		// Build subject
		subject := "home.events.>"
		if len(args) > 0 {
			subject = fmt.Sprintf("home.events.%s.>", args[0])
		}

		// Subscribe
		sub, err := nc.Subscribe(subject, func(msg *nats.Msg) {
			var data map[string]interface{}
			if err := json.Unmarshal(msg.Data, &data); err != nil {
				fmt.Printf("Error parsing message: %v\n", err)
				return
			}

			timestamp := data["timestamp"]
			eventType := data["event_type"]
			eventData := data["data"]

			fmt.Printf("[%s] %s: %v\n", 
				timestamp, 
				eventType,
				eventData,
			)
		})
		if err != nil {
			return err
		}
		defer sub.Unsubscribe()

		fmt.Printf("Watching for events on: %s\n", subject)
		fmt.Println("Press Ctrl+C to stop...")

		// Wait for interrupt
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		fmt.Println("\nStopping...")
		return nil
	},
}

var watchDiscoveryCmd = &cobra.Command{
	Use:   "discovery",
	Short: "Watch device discovery announcements",
	Long:  `Watch for new devices announcing themselves to the system.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Connect to NATS
		opts := []nats.Option{
			nats.Name("nats-ha-watcher"),
		}
		if natsUser != "" && natsPass != "" {
			opts = append(opts, nats.UserInfo(natsUser, natsPass))
		}

		nc, err := nats.Connect(natsURL, opts...)
		if err != nil {
			return fmt.Errorf("failed to connect: %w", err)
		}
		defer nc.Close()

		// Subscribe
		sub, err := nc.Subscribe("home.discovery.announce", func(msg *nats.Msg) {
			var device map[string]interface{}
			if err := json.Unmarshal(msg.Data, &device); err != nil {
				fmt.Printf("Error parsing message: %v\n", err)
				return
			}

			fmt.Printf("[%s] New device announced:\n", time.Now().Format("15:04:05"))
			fmt.Printf("  ID: %s\n", device["device_id"])
			fmt.Printf("  Type: %s\n", device["device_type"])
			fmt.Printf("  Name: %s\n", device["name"])
			if caps, ok := device["capabilities"].(map[string]interface{}); ok {
				if sensors, ok := caps["sensors"].([]interface{}); ok && len(sensors) > 0 {
					fmt.Printf("  Sensors: %v\n", sensors)
				}
			}
			fmt.Println()
		})
		if err != nil {
			return err
		}
		defer sub.Unsubscribe()

		fmt.Println("Watching for device announcements...")
		fmt.Println("Press Ctrl+C to stop...")

		// Wait for interrupt
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		fmt.Println("\nStopping...")
		return nil
	},
}

func init() {
	rootCmd.AddCommand(watchCmd)
	watchCmd.AddCommand(watchStatesCmd)
	watchCmd.AddCommand(watchEventsCmd)
	watchCmd.AddCommand(watchDiscoveryCmd)
}