/* Pi-hole: A black hole for Internet advertisements
 * (c) 2019 Pi-hole, LLC (https://pi-hole.net)
 * Network-wide ad blocking via your own hardware.
 *
 * Web Interface
 * Queries Graph component
 *
 * This file is copyright under the latest version of the EUPL.
 * Please see LICENSE file for your rights under this license. */

import React, { Component, RefObject } from "react";
import ReactDOM from "react-dom";
import { Bar } from "react-chartjs-2";
import { WithTranslation, withTranslation } from "react-i18next";
import moment from "moment";
import { getIntervalForRange } from "../../util/graphUtils";
import api, { ApiClient } from "../../util/api";
import ChartTooltip from "./ChartTooltip";
import { WithAPIData } from "../common/WithAPIData";
import { ChartDataSets, ChartOptions, TimeUnit } from "chart.js";
import {
  TimeRange,
  TimeRangeContext
} from "../common/context/TimeRangeContext";

export interface QueriesGraphProps {
  loading: boolean;
  labels: Array<Date>;
  timeUnit: TimeUnit;
  rangeName?: string;
  datasets: Array<ChartDataSets>;
}


export class QueriesGraph extends Component<
QueriesGraphProps & WithTranslation,
  {}
> {
  private readonly graphRef: RefObject<Bar>;

  constructor(props: QueriesGraphProps & WithTranslation) {
    super(props);
    this.graphRef = React.createRef();
  }

  render() {
    const { t } = this.props;

    const options: ChartOptions = {
      tooltips: {
        enabled: false,
        mode: "x-axis",
        callbacks: {
          title: tooltipItem => {
            const time = moment(tooltipItem[0].xLabel!, "HH:mm");

            const fromTime = time.clone().subtract(5, "minutes");
            const toTime = time.clone().add(4, "minutes").add(59, "seconds");

            const from = fromTime.format("HH:mm:ss");
            const to = toTime.format("HH:mm:ss");

            return t("Queries from {{from}} to {{to}}", { from, to });
          },
          label: (tooltipItems, data) => {
            return (
              data.datasets![tooltipItems.datasetIndex!].label +
              ": " +
              tooltipItems.yLabel
            );
          }
        }
      },
      legend: { display: false },
      scales: {
        xAxes: [
          {
            type: "time",
            time: {
              unit: this.props.timeUnit,
              displayFormats: { hour: "HH:mm" },
              tooltipFormat: "HH:mm"
            },
            stacked: true
          }
        ],
        yAxes: [
          {
            ticks: { beginAtZero: true }
          }
        ]
      },
      maintainAspectRatio: false
    };

    const range = this.props.rangeName
      ? this.props.rangeName
      : t("Last 24 Hours");

    return (
      <div className="card">
        <div className="card-header">
          {t("Queries Over {{range}}", { range })}
        </div>
        <div className="card-body">
          <Bar
            width={970}
            height={170}
            data={{
              labels: this.props.labels,
              datasets: this.props.datasets
            }}
            options={options}
            ref={this.graphRef}
          />
        </div>

        {this.props.loading ? (
          <div
            className="card-img-overlay"
            style={{ background: "rgba(255,255,255,0.7)" }}
          >
            <i
              className="fa fa-refresh fa-spin"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                fontSize: "30px"
              }}
            />
          </div>
        ) : null}

        {
          // Now you're thinking with portals!
          ReactDOM.createPortal(
            <ChartTooltip chart={this.graphRef} handler={options.tooltips!} />,
            document.body
          )
        }
      </div>
    );
  }
}

/**
 * Transform the API data into props for QueriesGraph
 *
 * @param data The API data
 * @param range The time range to use
 * @returns {{labels: Date[], datasets: Array, loading: boolean}} QueriesGraphProps
 */
export const transformData = (
  data: Array<ApiHistoryGraphItem>,
  range: TimeRange | null
): QueriesGraphProps => {
  let timeUnit: TimeUnit = "hour";

  const datasets: Array<ChartDataSets> = [];

  if (range) {
    if (range.until.diff(range.from, "day") > 1) {
      timeUnit = "day";
    }
  } else {
    // Remove last data point as it's not yet finished
    data = data.slice(0, -1);
  }

  const labels = data.map(step => new Date(1000 * step.timestamp));

  datasets.push({
    label: 'blocked',
    backgroundColor: "#f86c6b",
    pointRadius: 0,
    pointHitRadius: 5,
    pointHoverRadius: 5,
    cubicInterpolationMode: "monotone",
    data: []
  });
  datasets[0].data = data.map(step => step.blocked_queries);
  datasets.push({
    label: 'total',
    backgroundColor: "#20a8d8",
    pointRadius: 0,
    pointHitRadius: 5,
    pointHoverRadius: 5,
    cubicInterpolationMode: "monotone",
    data: []
  });
  datasets[1].data = data.map(step => step.total_queries);

  return {
    loading: false,
    labels,
    timeUnit,
    rangeName: range ? range.name : undefined,
    datasets
  };
};

/**
 * The props used to show a loading state (either initial load or error)
 */
export const loadingProps: QueriesGraphProps = {
  loading: true,
  labels: [],
  timeUnit: "hour",
  rangeName: "---",
  datasets: []
};

export const TranslatedQueriesGraph = withTranslation([
  "dashboard",
  "time-ranges"
])(QueriesGraph);

export interface QueriesGraphContainerProps {
  apiClient: ApiClient;
}

export const QueriesGraphContainer = ({
  apiClient
}: QueriesGraphContainerProps) => (
  <TimeRangeContext.Consumer>
    {context => (
      <WithAPIData
        apiCall={() =>
          context.range
            ? apiClient.getHistoryGraphDb(
                context.range,
                getIntervalForRange(context.range)
              )
            : apiClient.getHistoryGraph()
        }
        repeatOptions={
          context.range
            ? undefined
            : {
                interval: 10 * 60 * 1000,
                ignoreCancel: true
              }
        }
        renderInitial={() => <TranslatedQueriesGraph {...loadingProps} />}
        renderOk={data => (
          <TranslatedQueriesGraph {...transformData(data, context.range)} />
        )}
        renderErr={() => <TranslatedQueriesGraph {...loadingProps} />}
      />
    )}
  </TimeRangeContext.Consumer>
);

QueriesGraphContainer.defaultProps = {
  apiClient: api
};
