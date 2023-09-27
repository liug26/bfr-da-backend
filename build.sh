#!/bin/sh

npm install
python3 -m pip install --upgrade pip
pip uninstall pandas numpy argparse plotly
pip install pandas numpy argparse plotly
