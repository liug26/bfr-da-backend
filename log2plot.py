import argparse
import plotly.graph_objects as go
import sys


# Usage example: python log2plot.py -i Downloads/0037.csv -p accx
print('Parsing arguments:', sys.argv)
parser = argparse.ArgumentParser()
parser.add_argument('-p', '--plot', nargs='+', required=True, help="space-separated data types")
parser.add_argument('-i', '--input', required=True, help="input csv log file")
parser.add_argument('-v', '--parser', required=False, default='data_parser', help="data parser module name")
parser.add_argument('-o', '--output', required=False, default='tempplot.html', help="output html file")
parser.add_argument('-t', '--title', required=False, default='Plot Title', help="graph title")
parser.add_argument('-x', '--xaxis_title', required=False, default='Time (s)', help="x axis title")
parser.add_argument('-y', '--yaxis_title', required=False, default='Y Axis Title', help="y axis title")
parser.add_argument('-l', '--legend_title', required=False, default='Legend', help="legend title")
parser.add_argument('--font_family', required=False, default='Courier New, monospace', help="font family")
parser.add_argument('--font_size', required=False, type=int, default=18, help="font size")
parser.add_argument('--font_color', required=False, default='RebeccaPurple', help="font color")
args = parser.parse_args()


# dynamically import data parser module
data_parser = __import__(args.parser)

# Reference
# https://plotly.com/python/figure-labels/
# https://plotly.com/python/line-and-scatter/


def main():
    print('Loading data from:', args.input)
    data_parser.load(args.input)

    print('Constructing figure')
    fig = go.Figure()
    fig.update_layout(
        title=args.title,
        xaxis_title=args.xaxis_title,
        yaxis_title=args.yaxis_title,
        legend_title=args.legend_title,
        font=dict(
            family=args.font_family,
            size=args.font_size,
            color=args.font_color
        )
    )
    for plot_data in args.plot:
        # check if plot_data is a valid key of data_parser.data
        if plot_data not in data_parser.data.keys():
            print('Warning:', plot_data, 'is not a valid data type, skipping')
            continue
        print('Adding', plot_data, 'data to figure')
        data = data_parser.data[plot_data]
        mode = 'markers' if data.is_bool else 'markers+lines'
        fig.add_trace(go.Scatter(x=data.x, y=data.y, mode=mode, name=data.title))

    print('Showing figure')
    fig.show()
    print('Writing figure to html')
    fig.write_html(args.output)


if __name__ == '__main__':
    main()
