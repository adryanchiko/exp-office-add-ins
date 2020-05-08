package main

import (
	"log"

	"github.com/gophercode/webapp"
	"github.com/gophercode/webapp/setting"
)

type hook struct{}

func (h *hook) Init(s *setting.Settings) error {
	// if helper.ExtraSetting(s, "office_add_ins.enabled").ToBool(false) {
	// 	mService := manifest.New(s)
	// 	if err := mService.InstallManifest(); err != nil {
	// 		log.Println(err)
	// 		return err
	// 	}
	// }

	return nil
}

func (h *hook) Close() error {
	log.Println("closed")

	return nil
}

func main() {
	webapp.Run(new(hook))
}
