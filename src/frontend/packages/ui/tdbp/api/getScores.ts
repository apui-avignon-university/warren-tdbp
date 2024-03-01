import { useQuery } from "@tanstack/react-query";
import { AxiosInstance } from "axios";
import { apiAxios } from "../../libs/axios";
import useTokenInterceptor from "../../hooks/useTokenInterceptor";
import { Action } from "./getSlidingWindow";

export const DEFAULT_BASE_QUERY_KEY = "scoresCohort";

export type Scores = {
  actions: Array<Action>;
  scores: Array<T>;
  total?: Array<number>;
  average?: Array<number>;
};

type ScoresQueryParams = {
  courseId: string;
  until: string;
};

const getScore = async (
  client: AxiosInstance,
  queryParams: ScoresQueryParams,
): Promise<Scores> => {
  const response = await client.get(`tdbp/scores`, {
    params: queryParams,
  });
  return response?.data;
};

type UseScoresReturn = {
  data: Scores | undefined;
  isFetching: boolean;
};

export const useScore = (queryParams: ScoresQueryParams): UseScoresReturn => {
  // Get the API client, set with the authorization headers and refresh mechanism
  const client = useTokenInterceptor(apiAxios);

  const { courseId, until } = queryParams;
  const queryResult = useQuery({
    queryKey: [DEFAULT_BASE_QUERY_KEY, courseId, until],
    queryFn: () => getScore(client, queryParams),
    staleTime: Infinity,
  });

  const { isFetching, data } = queryResult;

  return {
    data,
    isFetching,
  };
};
