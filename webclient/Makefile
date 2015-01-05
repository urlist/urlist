NO_COLOR=\033[0m
OK_COLOR=\033[32;01m
ERROR_COLOR=\033[31;01m
WARN_COLOR=\033[33;01m
HR=-------------------------------------------------------------------------------

TEMP_DIR:=$(shell mktemp -d /tmp/tmp.XXXXX)
BUILD_DIR:=src/builds

ifdef BRANCH
	EXT:=$(BRANCH).
endif

CURRENT_BRANCH=$(shell git rev-parse --abbrev-ref HEAD)
BRANCH=$(CURRENT_BRANCH)

build: header css js-conf js-libs js-app move-files footer
build-branch: header checkout-branch css js-conf js-libs js-app restore-branch move-files footer

test: checkout-branch restore-branch

save-current-branch:
	@echo $(shell git rev-parse --abbrev-ref HEAD) > .__current_branch

header:
	@echo "\n$(HR)"
	@echo "                          $(OK_COLOR)Preparing to launch Urlist$(NO_COLOR)"
	@echo "$(HR)\n"

footer:
	@echo "\n$(HR)"
	@echo "                          $(OK_COLOR)ready for lift off, capt'n$(NO_COLOR)"
	@echo "$(HR)\n"

checkout-branch: save-current-branch
	@echo "Check out $(ERROR_COLOR)$(BRANCH)$(NO_COLOR)"
	@echo
	@git checkout $(BRANCH) -q

restore-branch:
	@echo "Restore $(ERROR_COLOR)$(shell cat .__current_branch)$(NO_COLOR)"
	@git checkout $(shell cat .__current_branch) -q
	@rm .__current_branch

move-files:
	@echo "\nMoving files to the build directory..."
	@mv $(TEMP_DIR)/* $(BUILD_DIR)
	@rm -rf $(TEMP_DIR)


css:
	@echo "  Build CSS"
	@echo "    $(WARN_COLOR)$(TEMP_DIR)/$(EXT)styles.css$(NO_COLOR)"
	@echo
	@cd server && python mapping.py build styles > $(TEMP_DIR)/$(EXT)styles.css


js-conf:
	@echo "  Build App config"
	@echo "    $(WARN_COLOR)$(TEMP_DIR)/$(EXT)config.prod.min.js$(NO_COLOR)"
	@echo
	@cd server && python mapping.py build config > $(TEMP_DIR)/$(EXT)config.prod.min.js 2> /dev/null


js-libs:
	@echo "  Build JS-LIBS"
	@echo "    $(WARN_COLOR)$(TEMP_DIR)/$(EXT)libs.min.js$(NO_COLOR)"
	@echo
	@cd server && python mapping.py build libs > $(TEMP_DIR)/$(EXT)libs.min.js 2> /dev/null


js-app:
	@echo "  Build JS-APP"
	@echo "    $(WARN_COLOR)$(TEMP_DIR)/$(EXT)app.min.js$(NO_COLOR)"
	@echo
	@cd server && python mapping.py build app > $(TEMP_DIR)/$(EXT)app.min.js 2> /dev/null


js:
	@echo "  Build JS-ALL"
	@echo "    $(WARN_COLOR)$(TEMP_DIR)/$(EXT)all.min.js$(NO_COLOR)"
	@echo
	@cd server && python mapping.py build all > $(TEMP_DIR)/$(EXT)all.min.js 2> /dev/null

clean:
	@echo "Cleaning build dir"
	@rm $(BUILD_DIR)/*
	@git checkout -- $(BUILD_DIR)

docs:
	@echo "Generate documentation"
	@docco-husky --name "Urlist Web Client" src/app > /dev/null

.PHONY: build test checkout-branch restore-branch css js-conf js-libs js-app js docs header footer move-files clean

