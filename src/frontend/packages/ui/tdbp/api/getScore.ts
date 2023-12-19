import { useQuery } from "@tanstack/react-query";
import { AxiosInstance } from "axios";
import { apiAxios } from "../../libs/axios";
import useTokenInterceptor from "../../hooks/useTokenInterceptor";

export const DEFAULT_BASE_QUERY_KEY = "scoresCohort";

export type Score = {
  value: number;
  action_id: string;
  student_id: string;
};

type ScoreQueryParams = {
  courseId: string;
  until: string;
};

const getScore = async (
  client: AxiosInstance,
  queryParams: ScoreQueryParams,
): Promise<Array<Array<Score>>> => {
  const response = await client.get(`tdbp/score`, {
    params: queryParams,
  });
  return response?.data;
};

type UseScoresReturn = {
  data: Array<Array<Score>> | undefined;
  isFetching: boolean;
};

export const useScore = (queryParams: ScoreQueryParams): UseScoresReturn => {
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
