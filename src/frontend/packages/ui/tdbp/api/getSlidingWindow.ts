import { useQuery } from "@tanstack/react-query";
import { AxiosInstance } from "axios";
import { apiAxios } from "../../libs/axios";
import useTokenInterceptor from "../../hooks/useTokenInterceptor";

export const DEFAULT_BASE_QUERY_KEY = "slidingWindow";

export type Action = {
  iri: string;
  title: { [id: string]: string };
  type: string;
  activation_date?: string;
  cohort: Array<string>;
  activation_rate: number;
};

type DateTimeRange = {
  since: string;
  until: string;
};

type SlidingWindowResponse = {
  window: DateTimeRange;
  active_actions: Array<Action>;
  dynamic_cohort: Array<string>;
};

type SlidingWindowQueryParams = {
  courseId: string;
  until: string;
};

const getSlidingWindow = async (
  client: AxiosInstance,
  queryParams: SlidingWindowQueryParams,
): Promise<SlidingWindowResponse> => {
  const response = await client.get(`tdbp/window`, {
    params: queryParams,
  });
  return response?.data;
};

type UseSlidingWindowReturn = {
  slidingWindow: SlidingWindowResponse | undefined;
  isFetching: boolean;
};

export const useSlidingWindow = (
  queryParams: SlidingWindowQueryParams,
): UseSlidingWindowReturn => {
  // Get the API client, set with the authorization headers and refresh mechanism
  const client = useTokenInterceptor(apiAxios);

  const { courseId, until } = queryParams;
  const queryResult = useQuery({
    queryKey: [DEFAULT_BASE_QUERY_KEY, courseId, until],
    queryFn: () => getSlidingWindow(client, queryParams),
    staleTime: Infinity,
  });

  const { isFetching, data } = queryResult;

  return {
    slidingWindow: data,
    isFetching,
  };
};
