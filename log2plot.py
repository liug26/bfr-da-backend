import argparse
import data_parser
import plotly.graph_objects as go
import sys


# Usage example: python log2plot.py -i /Users/jasonliu/Downloads/0037.csv -p accx
print('Parsing arguments:', sys.argv)
parser = argparse.ArgumentParser()
parser.add_argument('-p', '--plot', nargs='+', required=True, help="")
parser.add_argument('-i', '--input', required=True, help="")
parser.add_argument('-t', '--title', required=False, default='Plot Title', help="")
parser.add_argument('-x', '--xaxis_title', required=False, default='Time (s)', help="")
parser.add_argument('-y', '--yaxis_title', required=False, default='Y Axis Title', help="")
parser.add_argument('-l', '--legend_title', required=False, default='Legend', help="")
parser.add_argument('--font_family', required=False, default='Courier New, monospace', help="")
parser.add_argument('--font_size', required=False, type=int, default=18, help="")
parser.add_argument('--font_color', required=False, default='RebeccaPurple', help="")

args = parser.parse_args()

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
            print('Warning:', plot_data, 'is not a valid data key, skipping')
            continue
        print('Adding', plot_data, 'data to figure')
        data = data_parser.data[plot_data]
        mode = 'markers' if data.is_bool else 'markers+lines'
        fig.add_trace(go.Scatter(x=data.x, y=data.y, mode=mode, name=data.title))
    print('Showing figure')
    fig.show()
    print('Writing figure to html')
    fig.write_html('tempplot.html')


if __name__ == '__main__':
    main()
