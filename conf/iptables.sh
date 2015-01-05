#!/bin/sh

iptables -N MongoDB
iptables -I INPUT -s 0/0 -p tcp --dport 27017 -j MongoDB
iptables -I INPUT -s 0/0 -p tcp --dport 28017 -j MongoDB
iptables -I MongoDB -s 127.0.0.1 -j ACCEPT
iptables -I MongoDB -s 10.0.0.1 -j ACCEPT
iptables -I MongoDB -s 10.0.0.2 -j ACCEPT
iptables -I MongoDB -s 10.0.0.3 -j ACCEPT
iptables -A MongoDB -s 0/0 -j DROP
