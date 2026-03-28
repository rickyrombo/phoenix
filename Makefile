.PHONY: all push

all:
	docker compose build

push:
	docker compose build
	docker compose push
