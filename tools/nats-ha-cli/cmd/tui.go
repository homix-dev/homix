package cmd

import (
	"github.com/calmera/nats-home-automation/tools/nats-ha-cli/internal/tui"
	"github.com/spf13/cobra"
)

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Launch interactive TUI",
	Long:  `Launch the interactive Terminal User Interface for managing your home automation system.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		simple, _ := cmd.Flags().GetBool("simple")
		if simple {
			return tui.RunSimple(natsURL, natsUser, natsPass)
		}
		return tui.Run(natsURL, natsUser, natsPass)
	},
}

func init() {
	rootCmd.AddCommand(tuiCmd)
	tuiCmd.Flags().Bool("simple", false, "Use simplified TUI")
}