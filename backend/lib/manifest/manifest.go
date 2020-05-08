package manifest

import (
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"log"

	"github.com/gophercode/webapp/lib/helper"
	"github.com/gophercode/webapp/setting"
)

type Manifest struct {
	ID string `xml:"Id"`
}

type Service struct {
	config   *setting.Settings
	manifest Manifest
}

func (s *Service) loadManifest() error {
	manifestPath := helper.ExtraSetting(s.config, "office_add_ins.manifest_path").ToString()

	databyte, err := ioutil.ReadFile(manifestPath)
	if err != nil {
		log.Fatal(err)
		return err
	}

	dataManifest := Manifest{}
	if err := xml.Unmarshal(databyte, &dataManifest); err != nil {
		return err
	}

	s.manifest = dataManifest

	return nil
}

func (s *Service) InstallManifest() error {
	isEnabled := helper.ExtraSetting(s.config, "office_add_ins.enabled").ToBool(false)
	if !isEnabled {
		return fmt.Errorf("%s", "You're not developing office add-ins")
	}

	if err := s.loadManifest(); err != nil {
		return err
	}

	if err := s.copyManifest(); err != nil {
		return err
	}

	if err := s.createNewFile(); err != nil {
		return err
	}

	log.Println("Install office manifest done")

	return nil
}

func New(s *setting.Settings) *Service {
	return &Service{
		config: s,
	}
}
