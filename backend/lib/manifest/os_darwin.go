// +build darwin

package manifest

import (
	"io"
	"log"
	"os"
	"path"

	"github.com/gophercode/webapp/lib/helper"
	"github.com/360EntSecGroup-Skylar/excelize"
)

const (
	WordPath    = "path/to/word/wef"
	ExcelPath   = "Library/Containers/com.microsoft.Excel/Data/Documents/wef"
	OutlookPath = "path/to/outlook/wef"
)

func (s *Service) copyManifest() error {
	userDir, _ := os.UserHomeDir()
	source := helper.ExtraSetting(s.config, "office_add_ins.manifest_path").ToString()
	dst := path.Join(userDir, ExcelPath, s.manifest.ID+"-manifest.yaml")

	sourceFile, err := os.Open(source)
	if err != nil {
		log.Fatal(err)
		return err
	}
	defer sourceFile.Close()

	newFile, err := os.Create(dst)
	if err != nil {
		log.Fatal(err)
		return err
	}
	defer newFile.Close()

	_, err = io.Copy(newFile, sourceFile)
	if err != nil {
		log.Fatal(err)
		return err
	}

	return nil
}

func (s *Service) createNewFile() error {
	tempDir := os.TempDir()
	fileName := path.Join(tempDir, "Excel add-in " + s.manifest.ID + ".xlsx")

	f := excelize.NewFile()

	if err := f.SaveAs(fileName); err != nil {
		log.Fatal(err)
		return err
	}

	return nil
}
